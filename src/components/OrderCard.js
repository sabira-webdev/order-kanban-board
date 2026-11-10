import { _n, sprintf } from '@wordpress/i18n';

import { timeAgo } from '../utils/time';

export default function OrderCard( { order } ) {
	return (
		<article className="okb-card">
			<div className="okb-card__head">
				<a className="okb-card__number" href={ order.edit_url }>
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
		</article>
	);
}