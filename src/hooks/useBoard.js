import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useReducer, useRef, useState } from '@wordpress/element';
import { addQueryArgs } from '@wordpress/url';

import boardReducer, { hasExtraPages, initialState } from '../store/boardReducer';
import usePolling from './usePolling';

const POLL_SECONDS = 60;

const isAbort = ( error ) => error?.name === 'AbortError';

export default function useBoard( { search = '' } = {} ) {
	const [ state, dispatch ] = useReducer( boardReducer, initialState );
	const [ loadingMore, setLoadingMore ] = useState( {} );

	// Lets async code read the latest state.
	const stateRef = useRef( state );
	stateRef.current = state;

	// The board request in flight, so a newer one can cancel it.
	const loadControllerRef = useRef( null );
	// "Show more" requests in flight, by column status.
	const moreControllersRef = useRef( new Map() );
	// Moves still being saved.
	const pendingMovesRef = useRef( 0 );
	// Goes up on every local change, so a stale silent reload can be ignored.
	const changesRef = useRef( 0 );

	const abortLoadMore = useCallback( () => {
		if ( moreControllersRef.current.size === 0 ) {
			return;
		}
		moreControllersRef.current.forEach( ( controller ) => controller.abort() );
		moreControllersRef.current.clear();
		setLoadingMore( {} );
	}, [] );

	/**
	 * Load the whole board (first pages, or search results).
	 * A silent load shows no spinner and keeps the board if it fails.
	 */
	const load = useCallback(
		async ( { silent = false } = {} ) => {
			loadControllerRef.current?.abort();
			abortLoadMore();

			const controller = new window.AbortController();
			loadControllerRef.current = controller;
			const changesAtStart = changesRef.current;

			if ( ! silent ) {
				dispatch( { type: 'LOAD_START' } );
			}

			try {
				const board = await apiFetch( {
					path: addQueryArgs( '/okb/v1/board', search ? { search } : {} ),
					signal: controller.signal,
				} );
				if ( controller.signal.aborted ) {
					return;
				}
				// Don't let a background refresh undo something that happened meanwhile.
				if ( silent && ( changesRef.current !== changesAtStart || pendingMovesRef.current > 0 ) ) {
					return;
				}
				dispatch( { type: 'LOAD_SUCCESS', board, receivedAt: Date.now() } );
			} catch ( error ) {
				if ( ! isAbort( error ) && ! silent ) {
					dispatch( { type: 'LOAD_ERROR', error } );
				}
			} finally {
				if ( loadControllerRef.current === controller ) {
					loadControllerRef.current = null;
				}
			}
		},
		[ search, abortLoadMore ]
	);

	// Load on start, and again whenever the search changes.
	useEffect( () => {
		load();
	}, [ load ] );

	// Cancel everything on unmount.
	useEffect(
		() => () => {
			loadControllerRef.current?.abort();
			moreControllersRef.current.forEach( ( controller ) => controller.abort() );
		},
		[]
	);

	// Background refresh, only when it can't get in the way.
	const poll = useCallback( () => {
		const current = stateRef.current;
		if (
			search ||
			pendingMovesRef.current > 0 ||
			loadControllerRef.current ||
			moreControllersRef.current.size > 0 ||
			current.loadState === 'loading' ||
			hasExtraPages( current )
		) {
			return;
		}
		load( { silent: true } );
	}, [ load, search ] );

	usePolling( poll, POLL_SECONDS );

	/**
	 * Move the card first, then save. Returns the old status (for Undo).
	 */
	const moveOrder = useCallback( async ( orderId, to ) => {
		const order = stateRef.current.orders[ orderId ];
		if ( ! order || order.status === to ) {
			return null;
		}

		const from = order.status;
		changesRef.current += 1;
		pendingMovesRef.current += 1;
		dispatch( { type: 'MOVE', orderId, from, to } );

		try {
			const updated = await apiFetch( {
				path: `/okb/v1/orders/${ orderId }/status`,
				method: 'POST',
				data: { status: to, from },
			} );
			dispatch( { type: 'UPSERT_ORDER', order: updated } );
			return { from };
		} catch ( error ) {
			if ( error.code === 'okb_conflict' && error.data?.order ) {
				// Someone else changed it: show the real status.
				dispatch( { type: 'UPSERT_ORDER', order: error.data.order } );
			} else {
				// Saving failed: put the card back.
				dispatch( { type: 'MOVE', orderId, from: to, to: from } );
			}
			throw error;
		} finally {
			pendingMovesRef.current -= 1;
		}
	}, [] );

	// Replace one card with fresh data (for example, after adding a note).
	const updateOrder = useCallback( ( order ) => {
		changesRef.current += 1;
		dispatch( { type: 'UPSERT_ORDER', order } );
	}, [] );

	/**
	 * Load the next page of one column. Throws if it fails.
	 */
	const loadMore = useCallback( async ( status ) => {
		const column = stateRef.current.columns[ status ];
		if ( ! column || ! column.hasMore || moreControllersRef.current.has( status ) ) {
			return;
		}

		const controller = new window.AbortController();
		moreControllersRef.current.set( status, controller );
		setLoadingMore( ( prev ) => ( { ...prev, [ status ]: true } ) );

		try {
			const data = await apiFetch( {
				path: addQueryArgs( `/okb/v1/columns/${ encodeURIComponent( status ) }/orders`, {
					page: column.page + 1,
				} ),
				signal: controller.signal,
			} );
			if ( ! controller.signal.aborted ) {
				changesRef.current += 1;
				dispatch( { type: 'APPEND_PAGE', column: data } );
			}
		} catch ( error ) {
			if ( ! isAbort( error ) ) {
				throw error;
			}
		} finally {
			// A full reload may have cancelled and cleared this request already.
			if ( moreControllersRef.current.get( status ) === controller ) {
				moreControllersRef.current.delete( status );
				setLoadingMore( ( prev ) => ( { ...prev, [ status ]: false } ) );
			}
		}
	}, [] );

	const reload = useCallback( () => load(), [ load ] );

	return { state, reload, moveOrder, updateOrder, loadMore, loadingMore };
}
