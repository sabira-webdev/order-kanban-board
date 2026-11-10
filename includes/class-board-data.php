<?php
/**
 * Loads orders and shapes them for the board.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

class Board_Data {

	const COLUMNS    = array( 'wc-on-hold', 'wc-processing', 'wc-packing', 'wc-ready-to-ship', 'wc-completed' );
	const PER_COLUMN = 20;

	public function get_board() {
		$columns = array();
		foreach ( self::COLUMNS as $status ) {
			$columns[] = $this->get_column( $status );
		}
		return array( 'columns' => $columns );
	}

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
	 * Short summary shown on a card.
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
			'shipping' => wp_strip_all_tags( $order->get_shipping_method() ),
			'has_note' => '' !== trim( (string) $order->get_customer_note() ),
			'edit_url' => $order->get_edit_order_url(),
		);
	}

	/**
	 * Everything the quick-view panel needs.
	 *
	 * @param \WC_Order $order Order.
	 * @return array
	 */
	public function details( $order ) {
		$currency = $order->get_currency();
		$incl_tax = 'incl' === get_option( 'woocommerce_tax_display_cart' );
		$items    = array();

		foreach ( $order->get_items() as $item ) {
			$product  = is_callable( array( $item, 'get_product' ) ) ? $item->get_product() : null;
			$image_id = $product ? $product->get_image_id() : 0;

			$items[] = array(
				'id'    => $item->get_id(),
				'name'  => wp_strip_all_tags( $item->get_name() ),
				'sku'   => $product ? (string) $product->get_sku() : '',
				'qty'   => (int) $item->get_quantity(),
				'total' => $this->plain_price( $order->get_line_total( $item, $incl_tax ), $currency ),
				'image' => $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : null,
			);
		}

		$notes = array();
		foreach ( wc_get_order_notes( array( 'order_id' => $order->get_id(), 'limit' => 20 ) ) as $note ) {
			$notes[] = array(
				'id'          => (int) $note->id,
				'content'     => wp_strip_all_tags( $note->content ),
				'date'        => $note->date_created ? $note->date_created->format( DATE_ATOM ) : null,
				'to_customer' => (bool) $note->customer_note,
				'added_by'    => $note->added_by,
			);
		}

		return array_merge(
			$this->card( $order ),
			array(
				'email'            => $order->get_billing_email(),
				'phone'            => $order->get_billing_phone(),
				'payment_method'   => wp_strip_all_tags( $order->get_payment_method_title() ),
				'customer_note'    => wp_strip_all_tags( (string) $order->get_customer_note() ),
				'shipping_address' => $this->address_lines( $order->get_formatted_shipping_address() ),
				'line_items'       => $items,
				'totals'           => array(
					'subtotal' => $this->plain_price( $order->get_subtotal(), $currency ),
					'discount' => $order->get_total_discount() > 0 ? $this->plain_price( -1 * $order->get_total_discount(), $currency ) : null,
					'shipping' => $this->plain_price( $order->get_shipping_total(), $currency ),
					'tax'      => $this->plain_price( $order->get_total_tax(), $currency ),
					'total'    => $this->plain_price( $order->get_total(), $currency ),
				),
				'notes'            => $notes,
			)
		);
	}

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

	private function customer_name( $order ) {
		$name = trim( $order->get_formatted_billing_full_name() );
		if ( '' === $name ) {
			$name = trim( $order->get_billing_company() );
		}
		return '' !== $name ? wp_strip_all_tags( $name ) : __( 'Guest', 'order-kanban-board' );
	}

	private function plain_price( $amount, $currency ) {
		return html_entity_decode(
			wp_strip_all_tags( wc_price( $amount, array( 'currency' => $currency ) ) ),
			ENT_QUOTES,
			'UTF-8'
		);
	}

	/**
	 * WooCommerce's address HTML ("line<br/>line") as plain lines.
	 *
	 * @param string $html Formatted address.
	 * @return string[]
	 */
	private function address_lines( $html ) {
		if ( empty( $html ) ) {
			return array();
		}

		$lines = array_map(
			static function ( $line ) {
				return trim( html_entity_decode( wp_strip_all_tags( $line ), ENT_QUOTES, 'UTF-8' ) );
			},
			preg_split( '/<br\s*\/?>/i', $html )
		);

		return array_values( array_filter( $lines, 'strlen' ) );
	}
}