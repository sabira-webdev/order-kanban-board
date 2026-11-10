import Column from './Column';

export default function Board( { columns } ) {
	return (
		<div className="okb-board">
			{ columns.map( ( column ) => (
				<Column key={ column.status } column={ column } />
			) ) }
		</div>
	);
}