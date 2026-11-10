import { useDraggable } from '@dnd-kit/core';
import { _n, sprintf } from '@wordpress/i18n';

import { timeAgo } from '../utils/time';

/**
 * What's inside a card. Used by the real card and by the drag preview.
 */
function CardContent( { order } ) {
	return (
		<>
			<div className="okb-card__head">
				<a
					className="okb-card__number"
					href={ order.edit_url }
					draggable={ false }
				>
					#{ order.number }
				</a>
			</div>

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
				{ order.date && (
					<time dateTime={ order.date }>{ timeAgo( order.date ) }</time>
				) }
			</div>
		</>
	);
}

/**
 * The copy of the card that follows the mouse while dragging.
 */
export function OrderCardPreview( { order } ) {
	return (
		<div className="okb-card is-overlay">
			<CardContent order={ order } />
		</div>
	);
}

/**
 * A card you can drag to another column.
 */
export default function OrderCard( { order } ) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable( {
		id: order.id,
		data: { order },
	} );

	return (
		<article
			ref={ setNodeRef }
			className={ isDragging ? 'okb-card is-dragging' : 'okb-card' }
			{ ...attributes }
			{ ...listeners }
		>
			<CardContent order={ order } />
		</article>
	);
}