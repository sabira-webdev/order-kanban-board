<?php
/**
 * Runs when the plugin is deleted. Removes only the plugin's settings;
 * orders and their statuses are never touched.
 *
 * @package OrderKanbanBoard
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'okb_settings' );
