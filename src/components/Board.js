import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { useState } from '@wordpress/element';

import Column from './Column';
import { OrderCardPreview } from './OrderCard';

export default function Board( {
	state,
	onMove,
	onOpen,
	pageSize,
	loadingMore,
	onLoadMore,
} ) {
	const [ activeId, setActiveId ] = useState( null );

	const sensors = useSensors(
		useSensor( PointerSensor, { activationConstraint: { distance: 6 } } ),
		useSensor( KeyboardSensor )
	);

	const handleDragEnd = ( { active, over } ) => {
		setActiveId( null );
		const order = state.orders[ active.id ];
		if ( over && order && order.status !== over.id ) {
			onMove( order.id, over.id );
		}
	};

	const activeOrder = activeId ? state.orders[ activeId ] : null;

	return (
		<DndContext
			sensors={ sensors }
			onDragStart={ ( { active } ) => setActiveId( active.id ) }
			onDragEnd={ handleDragEnd }
			onDragCancel={ () => setActiveId( null ) }
		>
			<div className="okb-board">
				{ state.columnOrder.map( ( status ) => (
					<Column
						key={ status }
						column={ state.columns[ status ] }
						orders={ state.orders }
						onOpen={ onOpen }
						isSearching={ state.search !== '' }
						pageSize={ pageSize }
						isLoadingMore={ Boolean( loadingMore[ status ] ) }
						onLoadMore={ onLoadMore }
					/>
				) ) }
			</div>

			<DragOverlay dropAnimation={ null }>
				{ activeOrder ? (
					<OrderCardPreview order={ activeOrder } />
				) : null }
			</DragOverlay>
		</DndContext>
	);
}
