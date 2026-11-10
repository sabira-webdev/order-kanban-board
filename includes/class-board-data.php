<?php
/**
 * Loads orders and shapes them for the board.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

class Board_Data {

	/**
	 * Statuses shown as columns, left to right.
	 * In Step 9 these will come from the settings screen.
	 */
	const COLUMNS = array( 'wc-on-hold', 'wc-processing', 'wc-packing', 'wc-ready-to-ship', 'wc-completed' );

	/**
	 * Orders loaded per column.
	 */
	const PER_COLUMN = 20;

	/**
	 * The full board: each column with its newest orders.
	 *
	 * @return array
	 */
	public function get_board() {
		$columns = array();

		foreach ( self::COLUMNS as $status ) {
			$columns[] = $this->get_column( $status );
		}

		return array( 'columns' => $columns );
	}

	/**
	 * One column: its label, total count and newest orders.
	 *
	 * @param string $status Status with "wc-" prefix.
	 * @return array
	 */
		public function get_column( $status ) {
		$result = wc_get_orders(
			array(
				'type'     => 'shop_order',
				'status'   => array( $status ),
				'limit'    => self::PER_COLUMN,
				'paginate' => true,
				'orderby'  => 'date',
				'order'    => 'DESC',
			)
		);

		return array(
			'status' => $status,
			'label'  => wc_get_order_status_name( $status ),
			'color'  => $this->status_color( $status ),
			'total'  => (int) $result->total,
			'orders' => array_map( array( $this, 'card' ), $result->orders ),
		);
	}

	/**
	 * The short order summary shown on a card.
	 *
	 * @param \WC_Order $order Order.
	 * @return array
	 */
	public function card( $order ) {
		$date = $order->get_date_created();

		return array(
			'id'       => $order->get_id(),
			'number'   => (string) $order->get_order_number(),
			'status'   => 'wc-' . $order->get_status(),
			'customer' => $this->customer_name( $order ),
			'total'    => $this->plain_price( $order->get_total(), $order->get_currency() ),
			'items'    => (int) $order->get_item_count(),
			'date'     => $date ? $date->format( DATE_ATOM ) : null,
			'edit_url' => $order->get_edit_order_url(),
		);
	}

	/**
	 * Column color for a status. Other plugins can change colors with the filter.
	 *
	 * @param string $status Status with "wc-" prefix.
	 * @return string Hex color.
	 */
	private function status_color( $status ) {
		$colors = apply_filters(
			'okb_status_colors',
			array(
				'wc-pending'       => '#8c8f94',
				'wc-on-hold'       => '#b26200',
				'wc-processing'    => '#2271b1',
				'wc-packing'       => '#7a4fb0',
				'wc-ready-to-ship' => '#00838f',
				'wc-completed'     => '#008a20',
				'wc-cancelled'     => '#646970',
				'wc-refunded'      => '#646970',
				'wc-failed'        => '#d63638',
			)
		);

		return isset( $colors[ $status ] ) ? sanitize_hex_color( $colors[ $status ] ) : '#8c8f94';
	}

	/**
	 * Customer name, or company, or "Guest".
	 *
	 * @param \WC_Order $order Order.
	 * @return string
	 */
	private function customer_name( $order ) {
		$name = trim( $order->get_formatted_billing_full_name() );

		if ( '' === $name ) {
			$name = trim( $order->get_billing_company() );
		}

		return '' !== $name ? wp_strip_all_tags( $name ) : __( 'Guest', 'order-kanban-board' );
	}

	/**
	 * Price in the store's format as plain text, e.g. "₹1,200.00".
	 *
	 * @param float  $amount   Amount.
	 * @param string $currency Currency code.
	 * @return string
	 */
	private function plain_price( $amount, $currency ) {
		return html_entity_decode(
			wp_strip_all_tags( wc_price( $amount, array( 'currency' => $currency ) ) ),
			ENT_QUOTES,
			'UTF-8'
		);
	}
}