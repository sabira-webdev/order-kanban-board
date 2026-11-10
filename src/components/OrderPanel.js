import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	CheckboxControl,
	Notice,
	SelectControl,
	Spinner,
	TextareaControl,
} from '@wordpress/components';
import {
	useConstrainedTabbing,
	useFocusOnMount,
	useFocusReturn,
	useMergeRefs,
} from '@wordpress/compose';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import useOrderDetails from '../hooks/useOrderDetails';
import { timeAgo } from '../utils/time';

function NoteForm( { orderId, onAdded } ) {
	const [ note, setNote ] = useState( '' );
	const [ toCustomer, setToCustomer ] = useState( false );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( null );

	const submit = async ( event ) => {
		event.preventDefault();
		setIsSaving( true );
		setError( null );
		try {
			const details = await apiFetch( {
				path: `/okb/v1/orders/${ orderId }/notes`,
				method: 'POST',
				data: { note, to_customer: toCustomer },
			} );
			onAdded( details );
			setNote( '' );
			setToCustomer( false );
		} catch ( err ) {
			setError( err.message );
		} finally {
			setIsSaving( false );
		}
	};

	return (
		<form className="okb-panel__note-form" onSubmit={ submit }>
			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }
			<TextareaControl
				label={ __( 'Add a note', 'order-kanban-board' ) }
				value={ note }
				onChange={ setNote }
				rows={ 3 }
				__nextHasNoMarginBottom
			/>
			<CheckboxControl
				label={ __(
					'Send to customer by email',
					'order-kanban-board'
				) }
				checked={ toCustomer }
				onChange={ setToCustomer }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				type="submit"
				isBusy={ isSaving }
				disabled={ isSaving || ! note.trim() }
			>
				{ toCustomer
					? __( 'Send note', 'order-kanban-board' )
					: __( 'Add note', 'order-kanban-board' ) }
			</Button>
		</form>
	);
}

export default function OrderPanel( {
	orderId,
	status,
	statuses,
	onClose,
	onMove,
	onUpdate,
} ) {
	const { details, error, isLoading, setDetails } = useOrderDetails(
		orderId,
		status
	);

	// Accessible dialog: focus moves inside, Tab stays inside, focus returns on close.
	const ref = useMergeRefs( [
		useFocusOnMount( 'firstElement' ),
		useConstrainedTabbing(),
		useFocusReturn(),
	] );

	// Escape closes the panel.
	useEffect( () => {
		const onKey = ( event ) => {
			if ( event.key === 'Escape' && ! event.defaultPrevented ) {
				onClose();
			}
		};
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ onClose ] );

	const handleNoteAdded = ( updated ) => {
		setDetails( updated );
		onUpdate( updated );
	};

	return (
		<div
			className="okb-panel-backdrop"
			role="presentation"
			onMouseDown={ ( event ) => {
				if ( event.target === event.currentTarget ) {
					onClose();
				}
			} }
		>
			<div
				ref={ ref }
				className="okb-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="okb-panel-title"
			>
				<header className="okb-panel__header">
					<h2 id="okb-panel-title" className="okb-panel__title">
						{ details
							? sprintf(
									/* translators: %s: order number */ __(
										'Order #%s',
										'order-kanban-board'
									),
									details.number
								)
							: __( 'Order', 'order-kanban-board' ) }
					</h2>
					<Button
						icon="no-alt"
						label={ __( 'Close', 'order-kanban-board' ) }
						onClick={ onClose }
					/>
				</header>

				{ error && (
					<Notice status="error" isDismissible={ false }>
						{ error.message }
					</Notice>
				) }

				{ ! details && isLoading && (
					<div className="okb-panel__loading">
						<Spinner />
					</div>
				) }

				{ details && (
					<div
						className={
							isLoading
								? 'okb-panel__content is-refreshing'
								: 'okb-panel__content'
						}
					>
						<SelectControl
							label={ __( 'Status', 'order-kanban-board' ) }
							value={ status }
							options={ statuses }
							onChange={ ( next ) => onMove( details.id, next ) }
							__nextHasNoMarginBottom
						/>

						{ details.customer_note && (
							<section className="okb-panel__section okb-panel__customer-note">
								<h3>
									{ __(
										'Note from customer',
										'order-kanban-board'
									) }
								</h3>
								<p>{ details.customer_note }</p>
							</section>
						) }

						<section className="okb-panel__section">
							<h3>{ __( 'Items', 'order-kanban-board' ) }</h3>
							<ul className="okb-items">
								{ details.line_items.map( ( item ) => (
									<li
										key={ item.id }
										className="okb-items__row"
									>
										{ item.image ? (
											<img
												src={ item.image }
												alt=""
												width="40"
												height="40"
												loading="lazy"
											/>
										) : (
											<span
												className="okb-items__placeholder"
												aria-hidden="true"
											/>
										) }
										<span className="okb-items__name">
											{ item.name }
											{ item.sku && (
												<small>{ item.sku }</small>
											) }
										</span>
										<span className="okb-items__qty">
											× { item.qty }
										</span>
										<span className="okb-items__total">
											{ item.total }
										</span>
									</li>
								) ) }
							</ul>
							<dl className="okb-totals">
								<dt>
									{ __( 'Subtotal', 'order-kanban-board' ) }
								</dt>
								<dd>{ details.totals.subtotal }</dd>
								{ details.totals.discount && (
									<>
										<dt>
											{ __(
												'Discount',
												'order-kanban-board'
											) }
										</dt>
										<dd>{ details.totals.discount }</dd>
									</>
								) }
								<dt>
									{ __( 'Shipping', 'order-kanban-board' ) }
								</dt>
								<dd>{ details.totals.shipping }</dd>
								<dt>{ __( 'Tax', 'order-kanban-board' ) }</dt>
								<dd>{ details.totals.tax }</dd>
								<dt className="okb-totals__grand">
									{ __( 'Total', 'order-kanban-board' ) }
								</dt>
								<dd className="okb-totals__grand">
									{ details.totals.total }
								</dd>
							</dl>
						</section>

						<section className="okb-panel__section okb-panel__columns">
							<div>
								<h3>
									{ __( 'Ship to', 'order-kanban-board' ) }
								</h3>
								{ details.shipping_address.length ? (
									<address>
										{ details.shipping_address.map(
											( line, i ) => (
												<span key={ i }>{ line }</span>
											)
										) }
									</address>
								) : (
									<p className="okb-muted">
										{ __(
											'No shipping address',
											'order-kanban-board'
										) }
									</p>
								) }
								{ details.shipping && (
									<p className="okb-muted">
										{ details.shipping }
									</p>
								) }
							</div>
							<div>
								<h3>
									{ __( 'Customer', 'order-kanban-board' ) }
								</h3>
								<p>{ details.customer }</p>
								{ details.email && (
									<p>
										<a href={ `mailto:${ details.email }` }>
											{ details.email }
										</a>
									</p>
								) }
								{ details.phone && (
									<p>
										<a href={ `tel:${ details.phone }` }>
											{ details.phone }
										</a>
									</p>
								) }
								{ details.payment_method && (
									<p className="okb-muted">
										{ details.payment_method }
									</p>
								) }
							</div>
						</section>

						<section className="okb-panel__section">
							<h3>
								{ __( 'Order notes', 'order-kanban-board' ) }
							</h3>
							{ details.notes.length === 0 ? (
								<p className="okb-muted">
									{ __(
										'No notes yet.',
										'order-kanban-board'
									) }
								</p>
							) : (
								<ol className="okb-notes">
									{ details.notes.map( ( note ) => (
										<li
											key={ note.id }
											className={
												note.to_customer
													? 'is-customer'
													: ''
											}
										>
											<p>{ note.content }</p>
											<small>
												{ [
													note.to_customer &&
														__(
															'Sent to customer',
															'order-kanban-board'
														),
													note.added_by !==
														'system' &&
														note.added_by,
													note.date &&
														timeAgo( note.date ),
												]
													.filter( Boolean )
													.join( ', ' ) }
											</small>
										</li>
									) ) }
								</ol>
							) }
							<NoteForm
								orderId={ details.id }
								onAdded={ handleNoteAdded }
							/>
						</section>

						<footer className="okb-panel__footer">
							<Button variant="link" href={ details.edit_url }>
								{ __(
									'Open full order',
									'order-kanban-board'
								) }
							</Button>
						</footer>
					</div>
				) }
			</div>
		</div>
	);
}
