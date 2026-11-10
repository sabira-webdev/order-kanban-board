<?php
/**
 * Plugin Name:       Order Kanban Board for WooCommerce
 * Description:       Manage WooCommerce orders on a drag-and-drop board.
 * Version:           1.0.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * WC requires at least: 8.0
 * Author:            Sabira K
 * License:           GPL-3.0-or-later
 * Text Domain:       order-kanban-board
 * Domain Path:       /languages
 *
 * @package OrderKanbanBoard
 */

defined( 'ABSPATH' ) || exit;

define( 'OKB_VERSION', '1.0.0' );
define( 'OKB_FILE', __FILE__ );
define( 'OKB_PATH', plugin_dir_path( __FILE__ ) );
define( 'OKB_URL', plugin_dir_url( __FILE__ ) );

require_once OKB_PATH . 'includes/class-settings.php';
require_once OKB_PATH . 'includes/class-order-statuses.php';
require_once OKB_PATH . 'includes/class-admin-page.php';
require_once OKB_PATH . 'includes/class-board-data.php';
require_once OKB_PATH . 'includes/class-rest-controller.php';

// Tell WooCommerce this plugin supports High-Performance Order Storage (HPOS).
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

// Start the plugin only when WooCommerce is active.
add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}

		$settings = new \OKB\Settings();
		$data     = new \OKB\Board_Data( $settings );

		( new \OKB\Order_Statuses() )->register();
		( new \OKB\Admin_Page( $settings ) )->register();
		( new \OKB\Rest_Controller( $data, $settings ) )->register();
	}
);
