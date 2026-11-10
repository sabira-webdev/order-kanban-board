import { Button } from '@wordpress/components';
import { createInterpolateElement, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const DURATIONS = { success: 6000, info: 6000, error: 10000 };
const COLORS = { success: '#00a32a', info: '#2271b1', error: '#d63638' };
const ICONS = { success: 'yes-alt', info: 'info', error: 'warning' };

/**
 * One toast. It dismisses itself when its progress bar animation ends;
 * hovering or focusing it pauses that animation, and so the timer.
 *
 * @param {Object}   props
 * @param {Object}   props.toast     { id, type, title, status?, action? }.
 * @param {Function} props.getStatus Status key => { label, color }.
 * @param {Function} props.onDismiss Remove a toast by ID.
 */
function Toast( { toast, getStatus, onDismiss } ) {
	const [ isHovered, setIsHovered ] = useState( false );
	const [ isFocused, setIsFocused ] = useState( false );

	const type = DURATIONS[ toast.type ] ? toast.type : 'info';
	const status = toast.status ? getStatus( toast.status ) : null;
	const color =
		type === 'success' && status?.color ? status.color : COLORS[ type ];
	const dismiss = () => onDismiss( toast.id );

	// "<status />" in the title becomes a pill in the status color.
	const title = status
		? createInterpolateElement( toast.title, {
				status: (
					<span
						className="okb-toast__status"
						style={ { '--okb-status': status.color } }
					>
						{ status.label }
					</span>
				),
			} )
		: toast.title;

	const classes = [ 'okb-toast', `is-${ type }` ];
	if ( isHovered || isFocused ) {
		classes.push( 'is-paused' );
	}

	return (
		<div
			className={ classes.join( ' ' ) }
			role={ type === 'error' ? 'alert' : 'status' }
			style={ {
				'--okb-toast-color': color,
				'--okb-toast-duration': `${ DURATIONS[ type ] }ms`,
			} }
			onMouseEnter={ () => setIsHovered( true ) }
			onMouseLeave={ () => setIsHovered( false ) }
			onFocus={ () => setIsFocused( true ) }
			onBlur={ ( event ) => {
				if ( ! event.currentTarget.contains( event.relatedTarget ) ) {
					setIsFocused( false );
				}
			} }
		>
			<span
				className={ `okb-toast__icon dashicons dashicons-${ ICONS[ type ] }` }
				aria-hidden="true"
			/>
			<p className="okb-toast__text">{ title }</p>
			<div className="okb-toast__actions">
				{ toast.action && (
					<Button
						variant="tertiary"
						size="compact"
						className="okb-toast__action"
						onClick={ () => {
							dismiss();
							toast.action.onClick();
						} }
					>
						{ toast.action.label }
					</Button>
				) }
				<Button
					className="okb-toast__close"
					size="small"
					icon="no-alt"
					label={ __( 'Dismiss', 'order-kanban-board' ) }
					onClick={ dismiss }
				/>
			</div>
			<span
				className="okb-toast__progress"
				aria-hidden="true"
				onAnimationEnd={ dismiss }
			/>
		</div>
	);
}

/**
 * Toast notifications at the bottom right, newest at the bottom.
 *
 * @param {Object}   props
 * @param {Array}    props.toasts    Toasts to show.
 * @param {Function} props.getStatus Status key => { label, color }.
 * @param {Function} props.onDismiss Remove a toast by ID.
 */
export default function Toasts( { toasts, getStatus, onDismiss } ) {
	return (
		<div className="okb-toasts">
			{ toasts.map( ( toast ) => (
				<Toast
					key={ toast.id }
					toast={ toast }
					getStatus={ getStatus }
					onDismiss={ onDismiss }
				/>
			) ) }
		</div>
	);
}
