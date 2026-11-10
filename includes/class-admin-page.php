<?php
/**
 * Admin page: WooCommerce → Order Board.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

/**
 * Adds the board page and loads its scripts.
 */
class Admin_Page {

	const SLUG = 'okb-order-board';

	/**
	 * Hook name of our page, used to load scripts only there.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	/**
	 * Board settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Set up the admin page.
	 *
	 * @param Settings $settings Board settings.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Connect to WordPress hooks.
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'add_menu' ), 60 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( OKB_FILE ), array( $this, 'add_action_links' ) );
	}

	/**
	 * "Open board" link on the Plugins screen.
	 *
	 * @param string[] $links Existing links.
	 * @return string[]
	 */
	public function add_action_links( $links ) {
		if ( current_user_can( 'edit_shop_orders' ) ) {
			array_unshift(
				$links,
				sprintf(
					'<a href="%s">%s</a>',
					esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ),
					esc_html__( 'Open board', 'order-kanban-board' )
				)
			);
		}
		return $links;
	}

	/**
	 * WooCommerce's order list, for HPOS or the classic posts screen.
	 *
	 * @return string
	 */
	private function orders_url() {
		$hpos = class_exists( \Automattic\WooCommerce\Utilities\OrderUtil::class )
			&& \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();

		return $hpos ? admin_url( 'admin.php?page=wc-orders' ) : admin_url( 'edit.php?post_type=shop_order' );
	}

	/**
	 * Add the page under the WooCommerce menu.
	 */
	public function add_menu() {
		$this->hook_suffix = (string) add_submenu_page(
			'woocommerce',
			__( 'Order Board', 'order-kanban-board' ),
			__( 'Order Board', 'order-kanban-board' ),
			'edit_shop_orders',
			self::SLUG,
			array( $this, 'render' )
		);
	}

	/**
	 * Page HTML. React draws the board inside #okb-root.
	 */
	public function render() {
		?>
		<div class="wrap">
			<h1 class="screen-reader-text"><?php esc_html_e( 'Order Board', 'order-kanban-board' ); ?></h1>
			<div id="okb-root"></div>
		</div>
		<?php
	}

	/**
	 * Load our built JavaScript, only on our page.
	 *
	 * @param string $hook Current admin page.
	 */
	public function enqueue( $hook ) {
		if ( $hook !== $this->hook_suffix ) {
			return;
		}

		$asset_file = OKB_PATH . 'build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = include $asset_file;

		wp_enqueue_script(
			'okb-board',
			OKB_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		$data = array(
			'settings'  => $this->settings->get(),
			// All order statuses, for the panel dropdown and the settings.
			'statuses'  => $this->settings->all_statuses(),
			'canManage' => current_user_can( 'manage_woocommerce' ),
			'ordersUrl' => $this->orders_url(),
		);

		wp_add_inline_script(
			'okb-board',
			'window.okbData = ' . wp_json_encode( $data ) . ';',
			'before'
		);

		wp_enqueue_style(
			'okb-board',
			OKB_URL . 'build/index.css',
			array( 'wp-components' ),
			$asset['version']
		);
	}
}
