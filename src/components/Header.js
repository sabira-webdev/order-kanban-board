import { Button, SearchControl } from '@wordpress/components';
import { useReducer } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import usePolling from '../hooks/usePolling';
import { timeAgo } from '../utils/time';

/**
 * Switch between WooCommerce's order list and this board.
 *
 * @param {Object} props
 * @param {string} props.ordersUrl URL of the WooCommerce order list.
 */
function ViewSwitch( { ordersUrl } ) {
	return (
		<nav
			className="okb-view-switch"
			aria-label={ __( 'Order views', 'order-kanban-board' ) }
		>
			<a className="okb-view-switch__option" href={ ordersUrl }>
				<span
					className="dashicons dashicons-list-view"
					aria-hidden="true"
				/>
				{ __( 'List', 'order-kanban-board' ) }
			</a>
			<span
				className="okb-view-switch__option is-active"
				aria-current="page"
			>
				<span
					className="dashicons dashicons-grid-view"
					aria-hidden="true"
				/>
				{ __( 'Board', 'order-kanban-board' ) }
			</span>
		</nav>
	);
}

export default function Header( {
	search,
	onSearchChange,
	updatedAt,
	isLoading,
	onRefresh,
	ordersUrl,
	canManage,
	onOpenSettings,
} ) {
	// Re-render every 30 seconds so the "updated …" tooltip stays current.
	const [ , tick ] = useReducer( ( n ) => n + 1, 0 );
	usePolling( tick, 30 );

	const refreshLabel = updatedAt
		? sprintf(
				/* translators: %s: relative time, e.g. "5 minutes ago" */
				__( 'Refresh (updated %s)', 'order-kanban-board' ),
				timeAgo( updatedAt )
			)
		: __( 'Refresh', 'order-kanban-board' );

	return (
		<div className="okb-header">
			<div className="okb-header__title-row">
				<h2 className="okb-app__title">
					{ __( 'Order board', 'order-kanban-board' ) }
				</h2>
				{ ordersUrl && <ViewSwitch ordersUrl={ ordersUrl } /> }
			</div>

			<div className="okb-header__toolbar">
				<SearchControl
					className="okb-header__search"
					label={ __( 'Search orders', 'order-kanban-board' ) }
					placeholder={ __(
						'Order number, name or email',
						'order-kanban-board'
					) }
					value={ search }
					onChange={ onSearchChange }
					__nextHasNoMarginBottom
				/>
				<Button
					className={
						isLoading
							? 'okb-icon-button is-spinning'
							: 'okb-icon-button'
					}
					__next40pxDefaultSize
					icon="update"
					label={ refreshLabel }
					onClick={ onRefresh }
					disabled={ isLoading }
				/>
				{ canManage && (
					<Button
						className="okb-icon-button"
						__next40pxDefaultSize
						icon="admin-generic"
						label={ __( 'Board settings', 'order-kanban-board' ) }
						onClick={ onOpenSettings }
					/>
				) }
			</div>

			{ /* Announces each successful load. A new key replaces the text node so it is read again. */ }
			<div className="screen-reader-text" aria-live="polite">
				{ updatedAt && (
					<span key={ updatedAt }>
						{ __( 'Board updated', 'order-kanban-board' ) }
					</span>
				) }
			</div>
		</div>
	);
}
