<?php
/**
 * Custom order statuses: Packing and Ready to ship.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

class Order_Statuses {

	/**
	 * Connect our functions to WordPress and WooCommerce hooks.
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_post_statuses' ) );
		add_filter( 'wc_order_statuses', array( $this, 'add_to_order_statuses' ) );
		add_filter( 'woocommerce_order_is_paid_statuses', array( $this, 'add_to_paid_statuses' ) );

		// "Change status to …" options in the orders list bulk actions.
		add_filter( 'bulk_actions-edit-shop_order', array( $this, 'add_bulk_actions' ), 20 );
		add_filter( 'bulk_actions-woocommerce_page_wc-orders', array( $this, 'add_bulk_actions' ), 20 );
	}

	/**
	 * Our statuses and their labels.
	 */
	public static function labels() {
		return array(
			'wc-packing'       => _x( 'Packing', 'Order status', 'order-kanban-board' ),
			'wc-ready-to-ship' => _x( 'Ready to ship', 'Order status', 'order-kanban-board' ),
		);
	}

	/**
	 * Register the statuses with WordPress.
	 */
	public function register_post_statuses() {
		register_post_status(
			'wc-packing',
			array(
				'label'                     => _x( 'Packing', 'Order status', 'order-kanban-board' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				/* translators: %s: number of orders */
				'label_count'               => _n_noop( 'Packing <span class="count">(%s)</span>', 'Packing <span class="count">(%s)</span>', 'order-kanban-board' ),
			)
		);

		register_post_status(
			'wc-ready-to-ship',
			array(
				'label'                     => _x( 'Ready to ship', 'Order status', 'order-kanban-board' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				/* translators: %s: number of orders */
				'label_count'               => _n_noop( 'Ready to ship <span class="count">(%s)</span>', 'Ready to ship <span class="count">(%s)</span>', 'order-kanban-board' ),
			)
		);
	}

	/**
	 * Add our statuses to WooCommerce's list, right after "Processing".
	 */
	public function add_to_order_statuses( $statuses ) {
		$result = array();

		foreach ( $statuses as $key => $label ) {
			$result[ $key ] = $label;

			if ( 'wc-processing' === $key ) {
				$result = array_merge( $result, self::labels() );
			}
		}

		// If another plugin removed "Processing", add ours at the end.
		return array_merge( $result, array_diff_key( self::labels(), $result ) );
	}

	/**
	 * Orders being packed or waiting to ship are already paid.
	 */
	public function add_to_paid_statuses( $statuses ) {
		return array_unique( array_merge( $statuses, array( 'packing', 'ready-to-ship' ) ) );
	}

	/**
	 * Add bulk actions to the orders list.
	 */
	public function add_bulk_actions( $actions ) {
		$actions['mark_packing']       = __( 'Change status to packing', 'order-kanban-board' );
		$actions['mark_ready-to-ship'] = __( 'Change status to ready to ship', 'order-kanban-board' );
		return $actions;
	}
}