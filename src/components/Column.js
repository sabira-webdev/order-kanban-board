import { useDroppable } from '@dnd-kit/core';
import { Button } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';

import OrderCard from './OrderCard';

export default function Column( {
	column,
	orders,
	onOpen,
	isSearching,
	pageSize,
	isLoadingMore,
	onLoadMore,
} ) {
	const { setNodeRef, isOver } = useDroppable( { id: column.status } );
	const headingId = `okb-column-${ column.status }`;
	const nextCount = Math.min( pageSize, column.total - column.orderIds.length );

	return (
		<section
			ref={ setNodeRef }
			className={ isOver ? 'okb-column is-over' : 'okb-column' }
			style={ { '--okb-status': column.color } }
			aria-labelledby={ headingId }
		>
			<header className="okb-column__header">
				<h2 id={ headingId } className="okb-column__title">{ column.label }</h2>
				<span className="okb-column__count">{ column.total }</span>
			</header>

			<div className="okb-column__list">
				{ column.orderIds.length === 0 ? (
					<p className="okb-column__empty">
						{ isSearching
							? __( 'No matching orders.', 'order-kanban-board' )
							: __( 'No orders. Drag one here to change its status.', 'order-kanban-board' ) }
					</p>
				) : (
					column.orderIds.map( ( id ) =>
						orders[ id ] ? <OrderCard key={ id } order={ orders[ id ] } onOpen={ onOpen } /> : null
					)
				) }

				{ column.hasMore && (
					<Button
						variant="tertiary"
						className="okb-column__more"
						onClick={ () => onLoadMore( column.status ) }
						isBusy={ isLoadingMore }
						disabled={ isLoadingMore }
					>
						{ nextCount > 0
							? sprintf(
								/* translators: %d: number of orders */
								_n( 'Show %d more', 'Show %d more', nextCount, 'order-kanban-board' ),
								nextCount
							)
							: __( 'Show more', 'order-kanban-board' ) }
					</Button>
				) }
			</div>
		</section>
	);
}
