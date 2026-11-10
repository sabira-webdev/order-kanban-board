<?php
/**
 * Loads orders and shapes them for the board.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

/**
 * Reads orders with the WooCommerce CRUD API and returns plain arrays for the REST API.
 */
class Board_Data {

	const MAX_SEARCH = 100;

	/**
	 * Board settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Set up the data loader.
	 *
	 * @param Settings $settings Board settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Status keys shown as columns, in order.
	 *
	 * @return string[]
	 */
	private function columns() {
		return $this->settings->get()['columns'];
	}

	/**
	 * All columns, or only the orders matching a search.
	 *
	 * @param string $search Optional search term.
	 * @return array
	 */
	public function get_board( $search = '' ) {
		if ( '' !== $search ) {
			return $this->search_board( $search );
		}

		$columns = array();
		foreach ( $this->columns() as $status ) {
			$columns[] = $this->get_column( $status );
		}
		return array( 'columns' => $columns );
	}

	/**
	 * One page of orders in a column, newest first.
	 *
	 * @param string $status Order status, with the "wc-" prefix.
	 * @param int    $page   Page number, starting at 1.
	 * @return array
	 */
	public function get_column( $status, $page = 1 ) {
		$page   = max( 1, (int) $page );
		$result = wc_get_orders(
			array(
				'type'     => 'shop_order',
				'status'   => array( $status ),
				'limit'    => $this->settings->get()['per_column'],
				'page'     => $page,
				'paginate' => true,
				'orderby'  => 'date',
				'order'    => 'DESC',
			)
		);

		return array(
			'status'   => $status,
			'label'    => wc_get_order_status_name( $status ),
			'color'    => $this->settings->status_color( $status ),
			'total'    => (int) $result->total,
			'page'     => $page,
			'has_more' => $page < (int) $result->max_num_pages,
			'orders'   => array_map( array( $this, 'card' ), $result->orders ),
		);
	}

	/**
	 * Orders matching a search (number, name, email…), grouped into the board columns.
	 *
	 * @param string $search Search term.
	 * @return array
	 */
	private function search_board( $search ) {
		$ids = array_map( 'absint', wc_order_search( $search ) );

		// Higher IDs are newer, so keep the newest matches.
		rsort( $ids );
		$ids = array_slice( array_unique( $ids ), 0, self::MAX_SEARCH );

		$grouped = array_fill_keys( $this->columns(), array() );

		foreach ( $ids as $id ) {
			$order = wc_get_order( $id );

			// Skip refunds and other order types, like the normal board does.
			if ( ! $order || 'shop_order' !== $order->get_type() ) {
				continue;
			}

			$status = 'wc-' . $order->get_status();
			if ( isset( $grouped[ $status ] ) ) {
				$grouped[ $status ][] = $order;
			}
		}

		$columns = array();
		foreach ( $grouped as $status => $orders ) {
			usort(
				$orders,
				static function ( $a, $b ) {
					$a_date = $a->get_date_created();
					$b_date = $b->get_date_created();
					return ( $b_date ? $b_date->getTimestamp() : 0 ) <=> ( $a_date ? $a_date->getTimestamp() : 0 );
				}
			);

			$columns[] = array(
				'status'   => $status,
				'label'    => wc_get_order_status_name( $status ),
				'color'    => $this->settings->status_color( $status ),
				'total'    => count( $orders ),
				'page'     => 1,
				'has_more' => false,
				'orders'   => array_map( array( $this, 'card' ), $orders ),
			);
		}

		return array(
			'columns' => $columns,
			'search'  => $search,
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

		$notes     = array();
		$raw_notes = wc_get_order_notes(
			array(
				'order_id' => $order->get_id(),
				'limit'    => 20,
			)
		);
		foreach ( $raw_notes as $note ) {
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

	/**
	 * Billing name, company, or "Guest".
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
	 * A formatted price as plain text (no HTML, no entities).
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
