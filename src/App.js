import { Button, Notice, Spinner } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import Board from './components/Board';
import ConfirmMoveModal from './components/ConfirmMoveModal';
import Header from './components/Header';
import OrderPanel from './components/OrderPanel';
import SettingsModal from './components/SettingsModal';
import Toasts from './components/Toasts';
import useBoard from './hooks/useBoard';
import useDebouncedValue from './hooks/useDebouncedValue';

const okbData = window.okbData || {};
const statuses = okbData.statuses || [];
// The panel dropdown only needs value and label.
const statusOptions = statuses.map( ( { value, label } ) => ( {
	value,
	label,
} ) );
const defaultSettings = {
	columns: [],
	per_column: 20,
	poll_seconds: 60,
	confirm_statuses: [],
};
let toastId = 0;

export default function App() {
	const [ settings, setSettings ] = useState( {
		...defaultSettings,
		...okbData.settings,
	} );
	const [ searchInput, setSearchInput ] = useState( '' );
	const search = useDebouncedValue( searchInput.trim(), 350 );
	const { state, reload, moveOrder, updateOrder, loadMore, loadingMore } =
		useBoard( {
			search,
			pollSeconds: settings.poll_seconds,
		} );
	const [ toasts, setToasts ] = useState( [] );
	const [ openOrderId, setOpenOrderId ] = useState( null );
	const [ pendingMove, setPendingMove ] = useState( null );
	const [ isSettingsOpen, setIsSettingsOpen ] = useState( false );

	/**
	 * Show a toast. At most 3 are kept; the oldest goes first.
	 *
	 * @param {Object} toast { type, title, status?, action? }.
	 */
	const addToast = useCallback( ( toast ) => {
		toastId += 1;
		setToasts( ( prev ) => [
			...prev.slice( -2 ),
			{ ...toast, id: `okb-toast-${ toastId }` },
		] );
	}, [] );

	const dismissToast = useCallback( ( id ) => {
		setToasts( ( prev ) => prev.filter( ( toast ) => toast.id !== id ) );
	}, [] );

	const showError = ( error, fallback ) =>
		addToast( { type: 'error', title: error?.message || fallback } );

	const labelOf = ( status ) =>
		state.columns[ status ]?.label ||
		statuses.find( ( s ) => s.value === status )?.label ||
		status;

	const colorOf = ( status ) =>
		state.columns[ status ]?.color ||
		statuses.find( ( s ) => s.value === status )?.color ||
		'#8c8f94';

	const getStatus = ( status ) => ( {
		label: labelOf( status ),
		color: colorOf( status ),
	} );

	const handleMove = async ( orderId, to ) => {
		const number = state.orders[ orderId ]?.number;
		try {
			const result = await moveOrder( orderId, to );
			if ( ! result ) {
				return;
			}
			addToast( {
				type: 'success',
				title: sprintf(
					/* translators: %s: order number. Keep <status />: it is replaced by the status name. */
					__( 'Order #%s moved to <status />', 'order-kanban-board' ),
					number
				),
				status: to,
				action: {
					label: __( 'Undo', 'order-kanban-board' ),
					onClick: () =>
						moveOrder( orderId, result.from ).catch( ( error ) =>
							showError(
								error,
								__(
									'The move could not be undone. Try again.',
									'order-kanban-board'
								)
							)
						),
				},
			} );
		} catch ( error ) {
			// Includes conflicts: the server's message explains what changed.
			showError(
				error,
				__(
					'The order could not be moved. Try again.',
					'order-kanban-board'
				)
			);
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
			setPendingMove( {
				orderId,
				to,
				number: order.number,
				label: labelOf( to ),
			} );
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
			showError(
				error,
				__(
					'More orders could not be loaded. Try again.',
					'order-kanban-board'
				)
			)
		);
	};

	const handleSettingsSaved = ( saved ) => {
		setSettings( saved );
		setIsSettingsOpen( false );
		addToast( {
			type: 'info',
			title: __( 'Board settings saved.', 'order-kanban-board' ),
		} );
		reload();
	};

	const hasBoard = state.columnOrder.length > 0;
	const isLoading = state.loadState === 'loading';
	const openOrder = openOrderId ? state.orders[ openOrderId ] : null;

	return (
		<div className="okb-app">
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
					<Button variant="secondary" onClick={ reload }>
						{ __( 'Try again', 'order-kanban-board' ) }
					</Button>
				</Notice>
			) }

			{ ! hasBoard && isLoading && <Spinner /> }

			{ hasBoard && (
				<div
					className={
						isLoading
							? 'okb-board-wrap is-loading'
							: 'okb-board-wrap'
					}
					aria-busy={ isLoading }
				>
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

			<Toasts
				toasts={ toasts }
				getStatus={ getStatus }
				onDismiss={ dismissToast }
			/>
		</div>
	);
}
