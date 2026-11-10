import { Button, Modal } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Ask before a status change that can't easily be taken back (cancel, refund…).
 *
 * @param {Object}   props
 * @param {string}   props.number    Order number.
 * @param {string}   props.label     Name of the new status.
 * @param {Function} props.onConfirm Move the order.
 * @param {Function} props.onCancel  Keep the current status.
 */
export default function ConfirmMoveModal( {
	number,
	label,
	onConfirm,
	onCancel,
} ) {
	return (
		<Modal
			title={ sprintf(
				/* translators: 1: order number, 2: status name */
				__( 'Move order #%1$s to %2$s?', 'order-kanban-board' ),
				number,
				label
			) }
			size="small"
			onRequestClose={ onCancel }
		>
			<p>
				{ __(
					'This changes the order status and may send an email to the customer. It does not refund any payment.',
					'order-kanban-board'
				) }
			</p>
			<div className="okb-modal-actions">
				<Button variant="tertiary" onClick={ onCancel }>
					{ __( 'Keep current status', 'order-kanban-board' ) }
				</Button>
				<Button variant="primary" isDestructive onClick={ onConfirm }>
					{ sprintf(
						/* translators: %s: status name */
						__( 'Move to %s', 'order-kanban-board' ),
						label
					) }
				</Button>
			</div>
		</Modal>
	);
}
