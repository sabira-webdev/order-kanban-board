import { Button, Notice, SnackbarList, Spinner } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import Board from './components/Board';
import OrderPanel from './components/OrderPanel';
import useBoard from './hooks/useBoard';

const statuses = window.okbData?.statuses || [];
let noticeId = 0;

export default function App() {
	const { state, reload, moveOrder, updateOrder } = useBoard();
	const [ notices, setNotices ] = useState( [] );
	const [ openOrderId, setOpenOrderId ] = useState( null );

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

	const hasBoard = state.columnOrder.length > 0;
	const openOrder = openOrderId ? state.orders[ openOrderId ] : null;

	return (
		<div className="okb-app">
			<h2 className="okb-app__title">{ __( 'Order board', 'order-kanban-board' ) }</h2>

			{ state.loadState === 'error' && (
				<Notice status="error" isDismissible={ false }>
					<p>{ state.error?.message }</p>
					<Button variant="secondary" onClick={ reload }>{ __( 'Try again', 'order-kanban-board' ) }</Button>
				</Notice>
			) }

			{ ! hasBoard && state.loadState === 'loading' && <Spinner /> }

			{ hasBoard && <Board state={ state } onMove={ handleMove } onOpen={ setOpenOrderId } /> }

			{ openOrder && (
				<OrderPanel
					orderId={ openOrder.id }
					status={ openOrder.status }
					statuses={ statuses }
					onClose={ () => setOpenOrderId( null ) }
					onMove={ handleMove }
					onUpdate={ updateOrder }
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