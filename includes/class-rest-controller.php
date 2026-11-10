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

/**
 * Registers and handles the okb/v1 REST routes.
 */
class Rest_Controller {

	const ROUTE_NAMESPACE = 'okb/v1';

	/**
	 * Order data loader.
	 *
	 * @var Board_Data
	 */
	private $data;

	/**
	 * Board settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Set up the controller.
	 *
	 * @param Board_Data $data     Order data loader.
	 * @param Settings   $settings Board settings.
	 */
	public function __construct( Board_Data $data, Settings $settings ) {
		$this->data     = $data;
		$this->settings = $settings;
	}

	/**
	 * Connect to WordPress hooks.
	 */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register all routes.
	 */
	public function register_routes() {
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'can_manage_orders' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'can_manage_settings' ),
					'args'                => array(
						'columns'          => array(
							'type'     => 'array',
							'items'    => array( 'type' => 'string' ),
							'minItems' => 1,
							'maxItems' => Settings::MAX_COLUMNS,
						),
						'per_column'       => array(
							'type' => 'integer',
							'enum' => Settings::PER_COLUMN_CHOICES,
						),
						'poll_seconds'     => array(
							'type' => 'integer',
							'enum' => Settings::POLL_CHOICES,
						),
						'confirm_statuses' => array(
							'type'  => 'array',
							'items' => array( 'type' => 'string' ),
						),
					),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/board',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_board' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
				'args'                => array(
					'search' => array(
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/columns/(?P<status>[\w-]+)/orders',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_column_orders' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
				'args'                => array(
					'status' => array(
						'type'              => 'string',
						'required'          => true,
						'validate_callback' => array( $this, 'is_valid_status' ),
					),
					'page'   => array(
						'type'    => 'integer',
						'minimum' => 1,
						'default' => 1,
					),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/orders/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_order' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
			)
		);

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
					'from'   => array( 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/orders/(?P<id>\d+)/notes',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'add_note' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
				'args'                => array(
					'note'        => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_textarea_field',
						'validate_callback' => static function ( $value ) {
							return is_string( $value ) && '' !== trim( $value );
						},
					),
					'to_customer' => array(
						'type'    => 'boolean',
						'default' => false,
					),
				),
			)
		);
	}

	/**
	 * Shop managers and admins can use the board.
	 *
	 * @return bool
	 */
	public function can_manage_orders() {
		return current_user_can( 'edit_shop_orders' );
	}

	/**
	 * Only users who manage WooCommerce can change the settings.
	 *
	 * @return bool
	 */
	public function can_manage_settings() {
		return current_user_can( 'manage_woocommerce' );
	}

	/**
	 * GET /settings
	 *
	 * @return \WP_REST_Response
	 */
	public function get_settings() {
		return rest_ensure_response( $this->settings->get() );
	}

	/**
	 * POST /settings. Only the keys that are sent are changed.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function update_settings( WP_REST_Request $request ) {
		$values = array();
		foreach ( array( 'columns', 'per_column', 'poll_seconds', 'confirm_statuses' ) as $key ) {
			if ( $request->has_param( $key ) ) {
				$values[ $key ] = $request[ $key ];
			}
		}

		return rest_ensure_response( $this->settings->update( $values ) );
	}

	/**
	 * Whether a value is a known order status key, like "wc-processing".
	 *
	 * @param mixed $value Value to check.
	 * @return bool
	 */
	public function is_valid_status( $value ) {
		return is_string( $value ) && array_key_exists( $value, wc_get_order_statuses() );
	}

	/**
	 * GET /board?search=
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_board( WP_REST_Request $request ) {
		return rest_ensure_response( $this->data->get_board( trim( (string) $request['search'] ) ) );
	}

	/**
	 * GET /columns/{status}/orders?page=N
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_column_orders( WP_REST_Request $request ) {
		return rest_ensure_response( $this->data->get_column( (string) $request['status'], (int) $request['page'] ) );
	}

	/**
	 * GET /orders/{id}
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function get_order( WP_REST_Request $request ) {
		$order = $this->find_order( (int) $request['id'] );
		if ( is_wp_error( $order ) ) {
			return $order;
		}
		return rest_ensure_response( $this->data->details( $order ) );
	}

	/**
	 * POST /orders/{id}/status (409 if someone else changed it first).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function update_status( WP_REST_Request $request ) {
		$order = $this->find_order( (int) $request['id'] );
		if ( is_wp_error( $order ) ) {
			return $order;
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
			$order->update_status( substr( $to, 3 ), $note, true );
		}

		return rest_ensure_response( $this->data->card( wc_get_order( $order->get_id() ) ) );
	}

	/**
	 * POST /orders/{id}/notes
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function add_note( WP_REST_Request $request ) {
		$order = $this->find_order( (int) $request['id'] );
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		// Customer notes are emailed to the customer by WooCommerce.
		$order->add_order_note( $request['note'], $request['to_customer'] ? 1 : 0, true );

		return rest_ensure_response( $this->data->details( wc_get_order( $order->get_id() ) ) );
	}

	/**
	 * Load an order, rejecting refunds and unknown IDs.
	 *
	 * @param int $id Order ID.
	 * @return \WC_Order|WP_Error
	 */
	private function find_order( $id ) {
		$order = wc_get_order( $id );
		if ( ! $order || 'shop_order' !== $order->get_type() ) {
			return new WP_Error( 'okb_not_found', __( 'Order not found.', 'order-kanban-board' ), array( 'status' => 404 ) );
		}
		return $order;
	}
}
