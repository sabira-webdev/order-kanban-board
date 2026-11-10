import { Button, Notice, SnackbarList, Spinner } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import Board from './components/Board';
import useBoard from './hooks/useBoard';

let noticeId = 0;

export default function App() {
	const { state, reload, moveOrder } = useBoard();
	const [ notices, setNotices ] = useState( [] );

	// Show a small message at the bottom (keeps the 3 newest).
	const notify = useCallback( ( content, actions = [] ) => {
		noticeId += 1;
		setNotices( ( prev ) => [ ...prev.slice( -2 ), { id: `okb-${ noticeId }`, content, actions } ] );
	}, [] );

	const labelOf = ( status ) => state.columns[ status ]?.label || status;

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
						onClick: () =>
							moveOrder( orderId, result.from ).catch( ( error ) => notify( error.message ) ),
					},
				]
			);
		} catch ( error ) {
			notify( error.message || __( 'The order could not be moved. Try again.', 'order-kanban-board' ) );
		}
	};

	const hasBoard = state.columnOrder.length > 0;

	return (
		<div className="okb-app">
			<h2 className="okb-app__title">{ __( 'Order board', 'order-kanban-board' ) }</h2>

			{ state.loadState === 'error' && (
				<Notice status="error" isDismissible={ false }>
					<p>{ state.error?.message }</p>
					<Button variant="secondary" onClick={ reload }>
						{ __( 'Try again', 'order-kanban-board' ) }
					</Button>
				</Notice>
			) }

			{ ! hasBoard && state.loadState === 'loading' && <Spinner /> }

			{ hasBoard && <Board state={ state } onMove={ handleMove } /> }

			<SnackbarList
				className="okb-snackbars"
				notices={ notices }
				onRemove={ ( id ) => setNotices( ( prev ) => prev.filter( ( n ) => n.id !== id ) ) }
			/>
		</div>
	);
}