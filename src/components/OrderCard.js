import { useDraggable } from '@dnd-kit/core';
import { __, _n, sprintf } from '@wordpress/i18n';

import { timeAgo } from '../utils/time';

const GripIcon = () => (
	<svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true" focusable="false">
		{ [ 3, 9, 15 ].map( ( y ) =>
			[ 3, 9 ].map( ( x ) => <circle key={ `${ x }-${ y }` } cx={ x } cy={ y } r="1.6" /> )
		) }
	</svg>
);

function CardBody( { order } ) {
	return (
		<>
			<div className="okb-card__body">
				<p className="okb-card__customer">{ order.customer }</p>
				<p className="okb-card__total">{ order.total }</p>
			</div>
			<div className="okb-card__meta">
				<span>
					{ sprintf(
						/* translators: %d: number of items */
						_n( '%d item', '%d items', order.items, 'order-kanban-board' ),
						order.items
					) }
				</span>
				{ order.date && <time dateTime={ order.date }>{ timeAgo( order.date ) }</time> }
				{ order.has_note && (
					<span className="okb-card__flag">{ __( 'Customer note', 'order-kanban-board' ) }</span>
				) }
			</div>
			{ order.shipping && <p className="okb-card__shipping">{ order.shipping }</p> }
		</>
	);
}

export function OrderCardPreview( { order } ) {
	return (
		<div className="okb-card is-overlay">
			<div className="okb-card__head">
				<span className="okb-card__number">#{ order.number }</span>
			</div>
			<CardBody order={ order } />
		</div>
	);
}

/**
 * Mouse/touch: drag anywhere on the card. Click: open the panel.
 * Keyboard: focus the grip, Space to pick up, arrows to move, Space to drop.
 */
export default function OrderCard( { order, onOpen } ) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable( { id: order.id } );

	return (
		<article
			ref={ setNodeRef }
			className={ isDragging ? 'okb-card is-dragging' : 'okb-card' }
			onPointerDown={ listeners?.onPointerDown }
		>
			<div className="okb-card__head">
				<button type="button" className="okb-card__open" onClick={ () => onOpen( order.id ) }>
					<span className="screen-reader-text">{ __( 'Open order', 'order-kanban-board' ) }</span>
					<span className="okb-card__number">#{ order.number }</span>
				</button>
				<button
					type="button"
					className="okb-card__handle"
					{ ...attributes }
					onKeyDown={ listeners?.onKeyDown }
					aria-label={ sprintf(
						/* translators: %s: order number */
						__( 'Move order #%s', 'order-kanban-board' ),
						order.number
					) }
				>
					<GripIcon />
				</button>
			</div>
			<CardBody order={ order } />
		</article>
	);
}