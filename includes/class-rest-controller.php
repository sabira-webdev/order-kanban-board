<?php
/**
 * REST API routes for the board (namespace: okb/v1).
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

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
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/board',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_board' ),
				'permission_callback' => array( $this, 'can_manage_orders' ),
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
	 * GET /okb/v1/board
	 *
	 * @return \WP_REST_Response
	 */
	public function get_board() {
		return rest_ensure_response( $this->data->get_board() );
	}
}