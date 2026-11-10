<?php
/**
 * Admin page: WooCommerce → Order Board.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

class Admin_Page {

	const SLUG = 'okb-order-board';

	/**
	 * Hook name of our page, used to load scripts only there.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	public function register() {
		add_action( 'admin_menu', array( $this, 'add_menu' ), 60 );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
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

		// All order statuses, for the status dropdown in the panel.
		$statuses = array();
		foreach ( wc_get_order_statuses() as $value => $label ) {
			if ( 'wc-checkout-draft' !== $value ) {
				$statuses[] = array(
					'value' => $value,
					'label' => $label,
				);
			}
		}

		wp_add_inline_script(
			'okb-board',
			'window.okbData = ' . wp_json_encode( array( 'statuses' => $statuses ) ) . ';',
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