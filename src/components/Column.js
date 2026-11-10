import { __ } from '@wordpress/i18n';

import OrderCard from './OrderCard';

export default function Column( { column } ) {
	const headingId = `okb-column-${ column.status }`;

	return (
		<section
			className="okb-column"
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
				{ column.orders.length === 0 ? (
					<p className="okb-column__empty">
						{ __( 'No orders.', 'order-kanban-board' ) }
					</p>
				) : (
					column.orders.map( ( order ) => (
						<OrderCard key={ order.id } order={ order } />
					) )
				) }
			</div>
		</section>
	);
}