import { useDroppable } from '@dnd-kit/core';
import { __ } from '@wordpress/i18n';

import OrderCard from './OrderCard';

export default function Column( { column, orders } ) {
	const { setNodeRef, isOver } = useDroppable( { id: column.status } );
	const headingId = `okb-column-${ column.status }`;

	return (
		<section
			ref={ setNodeRef }
			className={ isOver ? 'okb-column is-over' : 'okb-column' }
			style={ { '--okb-status': column.color } }
			aria-labelledby={ headingId }
		>
			<header className="okb-column__header">
				<h2 id={ headingId } className="okb-column__title">
					{ column.label }
				</h2>
				<span className="okb-column__count">{ column.total }</span>
			</header>

			<div className="okb-column__list">
				{ column.orderIds.length === 0 ? (
					<p className="okb-column__empty">
						{ __( 'No orders. Drag one here to change its status.', 'order-kanban-board' ) }
					</p>
				) : (
					column.orderIds.map( ( id ) =>
						orders[ id ] ? <OrderCard key={ id } order={ orders[ id ] } /> : null
					)
				) }
			</div>
		</section>
	);
}