import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useReducer, useRef } from '@wordpress/element';

import boardReducer, { initialState } from '../store/boardReducer';

export default function useBoard() {
	const [ state, dispatch ] = useReducer( boardReducer, initialState );

	// Lets async code read the latest state.
	const stateRef = useRef( state );
	stateRef.current = state;

	const load = useCallback( async () => {
		try {
			const board = await apiFetch( { path: '/okb/v1/board' } );
			dispatch( { type: 'LOAD_SUCCESS', board } );
		} catch ( error ) {
			dispatch( { type: 'LOAD_ERROR', error } );
		}
	}, [] );

	useEffect( () => {
		load();
	}, [ load ] );

	/**
	 * Move the card first, then save. Returns the old status (for Undo).
	 */
	const moveOrder = useCallback( async ( orderId, to ) => {
		const order = stateRef.current.orders[ orderId ];
		if ( ! order || order.status === to ) {
			return null;
		}

		const from = order.status;
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
		}
	}, [] );

		// Replace one card with fresh data (for example, after adding a note).
	const updateOrder = useCallback( ( order ) => {
		dispatch( { type: 'UPSERT_ORDER', order } );
	}, [] );

		return { state, reload: load, moveOrder, updateOrder };
}