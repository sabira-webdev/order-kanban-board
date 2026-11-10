<?php
/**
 * REST API routes for the board (namespace: okb/v1).
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

class Rest_Controller {

	const ROUTE_NAMESPACE = 'okb/v1';

	/**
	 * Board data.
	 *
	 * @var Board_Data
	 */
	private $data;

	/**
	 * @param Board_Data $data Board data.
	 */
	public function __construct( Board_Data $data ) {
		$this->data = $data;
	}

	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes() {
		// GET /okb/v1/board
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/board',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_board' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
			)
		);

		// POST /okb/v1/orders/123/status
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/orders/(?P<id>\d+)/status',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'update_status' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
				'args'                => array(
					'status' => array(
						'type'              => 'string',
						'required'          => true,
						'validate_callback' => array( $this, 'is_valid_status' ),
					),
					'from'   => array(
						'type' => 'string',
					),
				),
			)
		);
	}

	/**
	 * Only shop managers and admins can use the board.
	 *
	 * @return bool
	 */
	public function can_manage_orders() {
		return current_user_can( 'edit_shop_orders' );
	}

	/**
	 * The status must be a real WooCommerce status, like "wc-packing".
	 *
	 * @param mixed $value Value sent by the browser.
	 * @return bool
	 */
	public function is_valid_status( $value ) {
		return is_string( $value ) && array_key_exists( $value, wc_get_order_statuses() );
	}

	/**
	 * GET /okb/v1/board
	 *
	 * @return \WP_REST_Response
	 */
	public function get_board() {
		return rest_ensure_response( $this->data->get_board() );
	}

	/**
	 * POST /okb/v1/orders/{id}/status
	 *
	 * "from" is the status the browser thinks the order has. If someone else
	 * changed the order in the meantime, we stop and return 409 Conflict,
	 * so we never overwrite their change.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function update_status( WP_REST_Request $request ) {
		$order = wc_get_order( (int) $request['id'] );

		if ( ! $order || 'shop_order' !== $order->get_type() ) {
			return new WP_Error( 'okb_not_found', __( 'Order not found.', 'order-kanban-board' ), array( 'status' => 404 ) );
		}

		$current = 'wc-' . $order->get_status();
		$from    = (string) $request['from'];
		$to      = (string) $request['status'];

		if ( '' !== $from && $from !== $current ) {
			return new WP_Error(
				'okb_conflict',
				sprintf(
					/* translators: 1: order number, 2: status name */
					__( 'Order #%1$s was changed to %2$s by someone else. The board has been updated.', 'order-kanban-board' ),
					$order->get_order_number(),
					wc_get_order_status_name( $current )
				),
				array(
					'status' => 409,
					'order'  => $this->data->card( $order ),
				)
			);
		}

		if ( $to !== $current ) {
			$note = sprintf(
				/* translators: %s: user name */
				__( 'Moved on the Order Board by %s.', 'order-kanban-board' ),
				wp_get_current_user()->display_name
			);

			// update_status() saves the order and runs the normal WooCommerce emails and hooks.
			$order->update_status( substr( $to, 3 ), $note, true );
		}

		return rest_ensure_response( $this->data->card( wc_get_order( $order->get_id() ) ) );
	}
}