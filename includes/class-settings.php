<?php
/**
 * Board settings, stored in one option.
 *
 * @package OrderKanbanBoard
 */

namespace OKB;

defined( 'ABSPATH' ) || exit;

class Settings {

	const OPTION             = 'okb_settings';
	const MAX_COLUMNS        = 8;
	const PER_COLUMN_CHOICES = array( 10, 20, 30, 50 );
	const POLL_CHOICES       = array( 0, 30, 60, 300 );

	/**
	 * Validated settings for this request.
	 *
	 * @var array|null
	 */
	private $cache = null;

	/**
	 * Settings used when nothing has been saved yet.
	 *
	 * @return array
	 */
	public function defaults() {
		return array(
			'columns'          => array( 'wc-on-hold', 'wc-processing', 'wc-packing', 'wc-ready-to-ship', 'wc-completed' ),
			'per_column'       => 20,
			'poll_seconds'     => 60,
			'confirm_statuses' => array( 'wc-cancelled', 'wc-refunded', 'wc-failed' ),
		);
	}

	/**
	 * Saved settings merged with the defaults, always valid.
	 *
	 * @return array
	 */
	public function get() {
		if ( null === $this->cache ) {
			$saved       = get_option( self::OPTION, array() );
			$this->cache = $this->validate( array_merge( $this->defaults(), is_array( $saved ) ? $saved : array() ) );
		}
		return $this->cache;
	}

	/**
	 * Validate and save settings. Keys that are left out keep their current value.
	 *
	 * @param array $values New values.
	 * @return array The saved settings.
	 */
	public function update( array $values ) {
		$settings = $this->validate( array_merge( $this->get(), $values ) );

		update_option( self::OPTION, $settings, false );
		$this->cache = $settings;

		return $settings;
	}

	/**
	 * Colors for each status, filterable with 'okb_status_colors'.
	 *
	 * @return array Status key => hex color.
	 */
	public function status_colors() {
		return (array) apply_filters(
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
	}

	/**
	 * Color for one status, gray if unknown or invalid.
	 *
	 * @param string $status Status key with the "wc-" prefix.
	 * @return string
	 */
	public function status_color( $status ) {
		$colors = $this->status_colors();
		$color  = isset( $colors[ $status ] ) ? sanitize_hex_color( $colors[ $status ] ) : '';
		return $color ? $color : '#8c8f94';
	}

	/**
	 * Every order status the board can use.
	 *
	 * @return array[] List of { value, label, color }.
	 */
	public function all_statuses() {
		$statuses = array();
		foreach ( $this->status_labels() as $value => $label ) {
			$statuses[] = array(
				'value' => $value,
				'label' => $label,
				'color' => $this->status_color( $value ),
			);
		}
		return $statuses;
	}

	/**
	 * Status key => label, without the checkout draft status.
	 *
	 * @return array
	 */
	private function status_labels() {
		$statuses = wc_get_order_statuses();
		unset( $statuses['wc-checkout-draft'] );
		return $statuses;
	}

	/**
	 * Make every value safe to use.
	 *
	 * @param array $values Raw settings.
	 * @return array
	 */
	private function validate( array $values ) {
		$defaults = $this->defaults();

		$columns = array_slice( $this->valid_statuses( $values['columns'] ), 0, self::MAX_COLUMNS );
		if ( empty( $columns ) ) {
			$columns = $this->valid_statuses( $defaults['columns'] );
		}

		$per_column = absint( $values['per_column'] );
		if ( ! in_array( $per_column, self::PER_COLUMN_CHOICES, true ) ) {
			$per_column = $defaults['per_column'];
		}

		$poll_seconds = absint( $values['poll_seconds'] );
		if ( ! in_array( $poll_seconds, self::POLL_CHOICES, true ) ) {
			$poll_seconds = $defaults['poll_seconds'];
		}

		return array(
			'columns'          => $columns,
			'per_column'       => $per_column,
			'poll_seconds'     => $poll_seconds,
			'confirm_statuses' => $this->valid_statuses( $values['confirm_statuses'] ),
		);
	}

	/**
	 * Known status keys from a list, in order, without duplicates.
	 *
	 * @param mixed $list Raw list.
	 * @return string[]
	 */
	private function valid_statuses( $list ) {
		if ( ! is_array( $list ) ) {
			return array();
		}

		$known  = $this->status_labels();
		$result = array();

		foreach ( $list as $status ) {
			$status = is_string( $status ) ? sanitize_key( $status ) : '';
			if ( isset( $known[ $status ] ) && ! in_array( $status, $result, true ) ) {
				$result[] = $status;
			}
		}

		return $result;
	}
}
