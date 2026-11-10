import { Button, SearchControl } from '@wordpress/components';
import { useReducer } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import usePolling from '../hooks/usePolling';
import { timeAgo } from '../utils/time';

export default function Header( { search, onSearchChange, updatedAt, isLoading, onRefresh } ) {
	// Re-render every 30 seconds so "Updated … ago" stays current.
	const [ , tick ] = useReducer( ( n ) => n + 1, 0 );
	usePolling( tick, 30 );

	return (
		<div className="okb-header">
			<SearchControl
				className="okb-header__search"
				label={ __( 'Search orders', 'order-kanban-board' ) }
				placeholder={ __( 'Order number, name or email', 'order-kanban-board' ) }
				value={ search }
				onChange={ onSearchChange }
				__nextHasNoMarginBottom
			/>

			<div className="okb-header__actions">
				{ updatedAt && (
					<span className="okb-header__updated">
						{ sprintf(
							/* translators: %s: relative time, e.g. "5 minutes ago" */
							__( 'Updated %s', 'order-kanban-board' ),
							timeAgo( updatedAt )
						) }
					</span>
				) }
				<Button variant="secondary" onClick={ onRefresh } isBusy={ isLoading } disabled={ isLoading }>
					{ __( 'Refresh', 'order-kanban-board' ) }
				</Button>
			</div>
		</div>
	);
}
