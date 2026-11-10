import { Button, Notice, SnackbarList, Spinner } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import Board from './components/Board';
import ConfirmMoveModal from './components/ConfirmMoveModal';
import Header from './components/Header';
import OrderPanel from './components/OrderPanel';
import SettingsModal from './components/SettingsModal';
import useBoard from './hooks/useBoard';
import useDebouncedValue from './hooks/useDebouncedValue';

const okbData = window.okbData || {};
const statuses = okbData.statuses || [];
// The panel dropdown only needs value and label.
const statusOptions = statuses.map( ( { value, label } ) => ( { value, label } ) );
const defaultSettings = {
	columns: [],
	per_column: 20,
	poll_seconds: 60,
	confirm_statuses: [],
};
let noticeId = 0;

export default function App() {
	const [ settings, setSettings ] = useState( { ...defaultSettings, ...okbData.settings } );
	const [ searchInput, setSearchInput ] = useState( '' );
	const search = useDebouncedValue( searchInput.trim(), 350 );
	const { state, reload, moveOrder, updateOrder, loadMore, loadingMore } = useBoard( {
		search,
		pollSeconds: settings.poll_seconds,
	} );
	const [ notices, setNotices ] = useState( [] );
	const [ openOrderId, setOpenOrderId ] = useState( null );
	const [ pendingMove, setPendingMove ] = useState( null );
	const [ isSettingsOpen, setIsSettingsOpen ] = useState( false );

	const notify = useCallback( ( content, actions = [] ) => {
		noticeId += 1;
		setNotices( ( prev ) => [ ...prev.slice( -2 ), { id: `okb-${ noticeId }`, content, actions } ] );
	}, [] );

	const labelOf = ( status ) =>
		state.columns[ status ]?.label || statuses.find( ( s ) => s.value === status )?.label || status;

	const handleMove = async ( orderId, to ) => {
		const number = state.orders[ orderId ]?.number;
		try {
			const result = await moveOrder( orderId, to );
			if ( ! result ) {
				return;
			}
			notify(
				sprintf(
					/* translators: 1: order number, 2: status name */
					__( 'Order #%1$s moved to %2$s.', 'order-kanban-board' ),
					number,
					labelOf( to )
				),
				[
					{
						label: __( 'Undo', 'order-kanban-board' ),
						onClick: () => moveOrder( orderId, result.from ).catch( ( error ) => notify( error.message ) ),
					},
				]
			);
		} catch ( error ) {
			notify( error.message || __( 'The order could not be moved. Try again.', 'order-kanban-board' ) );
		}
	};

	/**
	 * Every status change (drag and drop, panel dropdown) starts here.
	 * Risky statuses are confirmed first.
	 *
	 * @param {number} orderId Order ID.
	 * @param {string} to      New status.
	 */
	const requestMove = ( orderId, to ) => {
		const order = state.orders[ orderId ];
		if ( ! order || order.status === to ) {
			return;
		}
		if ( settings.confirm_statuses.includes( to ) ) {
			setPendingMove( { orderId, to, number: order.number, label: labelOf( to ) } );
			return;
		}
		handleMove( orderId, to );
	};

	const confirmMove = () => {
		const { orderId, to } = pendingMove;
		setPendingMove( null );
		handleMove( orderId, to );
	};

	const handleLoadMore = ( status ) => {
		loadMore( status ).catch( ( error ) =>
			notify( error.message || __( 'More orders could not be loaded. Try again.', 'order-kanban-board' ) )
		);
	};

	const handleSettingsSaved = ( saved ) => {
		setSettings( saved );
		setIsSettingsOpen( false );
		notify( __( 'Board settings saved.', 'order-kanban-board' ) );
		reload();
	};

	const hasBoard = state.columnOrder.length > 0;
	const isLoading = state.loadState === 'loading';
	const openOrder = openOrderId ? state.orders[ openOrderId ] : null;

	return (
		<div className="okb-app">
			<h2 className="okb-app__title">{ __( 'Order board', 'order-kanban-board' ) }</h2>

			<Header
				search={ searchInput }
				onSearchChange={ setSearchInput }
				updatedAt={ state.updatedAt }
				isLoading={ isLoading }
				onRefresh={ reload }
				ordersUrl={ okbData.ordersUrl }
				canManage={ Boolean( okbData.canManage ) }
				onOpenSettings={ () => setIsSettingsOpen( true ) }
			/>

			{ state.loadState === 'error' && (
				<Notice status="error" isDismissible={ false }>
					<p>{ state.error?.message }</p>
					<Button variant="secondary" onClick={ reload }>{ __( 'Try again', 'order-kanban-board' ) }</Button>
				</Notice>
			) }

			{ ! hasBoard && isLoading && <Spinner /> }

			{ hasBoard && (
				<div className={ isLoading ? 'okb-board-wrap is-loading' : 'okb-board-wrap' } aria-busy={ isLoading }>
					<Board
						state={ state }
						onMove={ requestMove }
						onOpen={ setOpenOrderId }
						pageSize={ settings.per_column }
						loadingMore={ loadingMore }
						onLoadMore={ handleLoadMore }
					/>
				</div>
			) }

			{ openOrder && (
				<OrderPanel
					orderId={ openOrder.id }
					status={ openOrder.status }
					statuses={ statusOptions }
					onClose={ () => setOpenOrderId( null ) }
					onMove={ requestMove }
					onUpdate={ updateOrder }
				/>
			) }

			{ pendingMove && (
				<ConfirmMoveModal
					number={ pendingMove.number }
					label={ pendingMove.label }
					onConfirm={ confirmMove }
					onCancel={ () => setPendingMove( null ) }
				/>
			) }

			{ isSettingsOpen && (
				<SettingsModal
					settings={ settings }
					statuses={ statuses }
					onClose={ () => setIsSettingsOpen( false ) }
					onSaved={ handleSettingsSaved }
				/>
			) }

			<SnackbarList
				className="okb-snackbars"
				notices={ notices }
				onRemove={ ( id ) => setNotices( ( prev ) => prev.filter( ( n ) => n.id !== id ) ) }
			/>
		</div>
	);
}
