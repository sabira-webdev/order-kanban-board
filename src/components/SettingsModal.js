import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	CheckboxControl,
	Modal,
	Notice,
	SelectControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const MAX_COLUMNS = 8;

const PER_COLUMN_OPTIONS = [ 10, 20, 30, 50 ].map( ( n ) => ( {
	value: String( n ),
	label: String( n ),
} ) );

const POLL_OPTIONS = [
	{ value: '30', label: __( 'Every 30 seconds', 'order-kanban-board' ) },
	{ value: '60', label: __( 'Every minute', 'order-kanban-board' ) },
	{ value: '300', label: __( 'Every 5 minutes', 'order-kanban-board' ) },
	{
		value: '0',
		label: __( 'Never (refresh by hand)', 'order-kanban-board' ),
	},
];

/**
 * Choose and order the board columns, page size and refresh interval.
 *
 * @param {Object}   props
 * @param {Object}   props.settings Current settings.
 * @param {Array}    props.statuses All statuses as { value, label }.
 * @param {Function} props.onClose  Close without saving.
 * @param {Function} props.onSaved  Called with the saved settings.
 */
export default function SettingsModal( {
	settings,
	statuses,
	onClose,
	onSaved,
} ) {
	const [ columns, setColumns ] = useState( settings.columns );
	const [ perColumn, setPerColumn ] = useState(
		String( settings.per_column )
	);
	const [ pollSeconds, setPollSeconds ] = useState(
		String( settings.poll_seconds )
	);
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( null );

	const labelOf = ( value ) =>
		statuses.find( ( s ) => s.value === value )?.label || value;
	const available = statuses.filter( ( s ) => ! columns.includes( s.value ) );
	const isFull = columns.length >= MAX_COLUMNS;

	const move = ( index, offset ) => {
		const next = [ ...columns ];
		[ next[ index ], next[ index + offset ] ] = [
			next[ index + offset ],
			next[ index ],
		];
		setColumns( next );
	};

	const save = async ( event ) => {
		event.preventDefault();
		setIsSaving( true );
		setError( null );
		try {
			const saved = await apiFetch( {
				path: '/okb/v1/settings',
				method: 'POST',
				data: {
					columns,
					per_column: Number( perColumn ),
					poll_seconds: Number( pollSeconds ),
				},
			} );
			onSaved( saved );
		} catch ( err ) {
			setError(
				err.message ||
					__(
						'The settings could not be saved. Try again.',
						'order-kanban-board'
					)
			);
			setIsSaving( false );
		}
	};

	return (
		<Modal
			title={ __( 'Board settings', 'order-kanban-board' ) }
			onRequestClose={ onClose }
			className="okb-settings"
		>
			<form onSubmit={ save }>
				{ error && (
					<Notice status="error" isDismissible={ false }>
						{ error }
					</Notice>
				) }

				<h3 className="okb-settings__heading">
					{ __( 'Columns on the board', 'order-kanban-board' ) }
				</h3>
				<ul className="okb-settings__list">
					{ columns.map( ( value, index ) => {
						const label = labelOf( value );
						return (
							<li key={ value } className="okb-settings__row">
								<CheckboxControl
									label={ label }
									checked
									disabled={ columns.length === 1 }
									onChange={ () =>
										setColumns(
											columns.filter(
												( c ) => c !== value
											)
										)
									}
									__nextHasNoMarginBottom
								/>
								<span className="okb-settings__move">
									<Button
										icon="arrow-up-alt2"
										size="small"
										label={ sprintf(
											/* translators: %s: status name */
											__(
												'Move %s up',
												'order-kanban-board'
											),
											label
										) }
										disabled={ index === 0 }
										onClick={ () => move( index, -1 ) }
									/>
									<Button
										icon="arrow-down-alt2"
										size="small"
										label={ sprintf(
											/* translators: %s: status name */
											__(
												'Move %s down',
												'order-kanban-board'
											),
											label
										) }
										disabled={
											index === columns.length - 1
										}
										onClick={ () => move( index, 1 ) }
									/>
								</span>
							</li>
						);
					} ) }
				</ul>

				{ available.length > 0 && (
					<>
						<h3 className="okb-settings__heading">
							{ __( 'Add a column', 'order-kanban-board' ) }
						</h3>
						{ isFull && (
							<p className="okb-muted">
								{ sprintf(
									/* translators: %d: maximum number of columns */
									__(
										'The board can show up to %d columns.',
										'order-kanban-board'
									),
									MAX_COLUMNS
								) }
							</p>
						) }
						<ul className="okb-settings__list">
							{ available.map( ( status ) => (
								<li
									key={ status.value }
									className="okb-settings__row"
								>
									<CheckboxControl
										label={ status.label }
										checked={ false }
										disabled={ isFull }
										onChange={ () =>
											setColumns( [
												...columns,
												status.value,
											] )
										}
										__nextHasNoMarginBottom
									/>
								</li>
							) ) }
						</ul>
					</>
				) }

				<div className="okb-settings__selects">
					<SelectControl
						label={ __(
							'Orders loaded per column',
							'order-kanban-board'
						) }
						value={ perColumn }
						options={ PER_COLUMN_OPTIONS }
						onChange={ setPerColumn }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __(
							'Check for new orders',
							'order-kanban-board'
						) }
						value={ pollSeconds }
						options={ POLL_OPTIONS }
						onChange={ setPollSeconds }
						__nextHasNoMarginBottom
					/>
				</div>

				<div className="okb-modal-actions">
					<Button
						variant="tertiary"
						onClick={ onClose }
						disabled={ isSaving }
					>
						{ __( 'Cancel', 'order-kanban-board' ) }
					</Button>
					<Button
						variant="primary"
						type="submit"
						isBusy={ isSaving }
						disabled={ isSaving }
					>
						{ __( 'Save settings', 'order-kanban-board' ) }
					</Button>
				</div>
			</form>
		</Modal>
	);
}
