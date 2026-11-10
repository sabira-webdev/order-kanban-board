/**
 * Board state, "normalized": orders are stored once by ID, and columns
 * only hold lists of IDs. Moving a card just moves one ID between two lists.
 */
export const initialState = {
	loadState: 'loading',
	error: null,
	columnOrder: [],
	columns: {},
	orders: {},
};

// Newest orders first, like the server.
const byNewest = ( orders ) => ( a, b ) =>
	( orders[ b ]?.date || '' ).localeCompare( orders[ a ]?.date || '' );

function normalizeBoard( board ) {
	const columns = {};
	const orders = {};
	const columnOrder = [];

	for ( const column of board.columns ) {
		columnOrder.push( column.status );
		columns[ column.status ] = {
			status: column.status,
			label: column.label,
			color: column.color,
			total: column.total,
			orderIds: column.orders.map( ( order ) => order.id ),
		};
		for ( const order of column.orders ) {
			orders[ order.id ] = order;
		}
	}

	return { columns, orders, columnOrder };
}

function removeFromColumn( columns, status, orderId ) {
	const column = columns[ status ];
	if ( ! column || ! column.orderIds.includes( orderId ) ) {
		return columns;
	}
	return {
		...columns,
		[ status ]: {
			...column,
			total: Math.max( 0, column.total - 1 ),
			orderIds: column.orderIds.filter( ( id ) => id !== orderId ),
		},
	};
}

function addToColumn( columns, status, orderId, orders ) {
	const column = columns[ status ];
	if ( ! column || column.orderIds.includes( orderId ) ) {
		return columns;
	}
	return {
		...columns,
		[ status ]: {
			...column,
			total: column.total + 1,
			orderIds: [ ...column.orderIds, orderId ].sort( byNewest( orders ) ),
		},
	};
}

export default function boardReducer( state, action ) {
	switch ( action.type ) {
		case 'LOAD_SUCCESS':
			return { ...state, ...normalizeBoard( action.board ), loadState: 'ready', error: null };

		case 'LOAD_ERROR':
			return { ...state, loadState: 'error', error: action.error };

		// Move a card right away. Swapping from/to undoes it.
		case 'MOVE': {
			const { orderId, from, to } = action;
			const order = state.orders[ orderId ];
			if ( ! order || from === to ) {
				return state;
			}
			const orders = { ...state.orders, [ orderId ]: { ...order, status: to } };
			let columns = removeFromColumn( state.columns, from, orderId );
			columns = addToColumn( columns, to, orderId, orders );
			return { ...state, orders, columns };
		}

		// Replace an order with the server's version, moving it if its status differs.
		case 'UPSERT_ORDER': {
			const incoming = action.order;
			const existing = state.orders[ incoming.id ];
			const orders = { ...state.orders, [ incoming.id ]: incoming };
			let columns = state.columns;
			if ( existing && existing.status !== incoming.status ) {
				columns = removeFromColumn( columns, existing.status, incoming.id );
			}
			columns = addToColumn( columns, incoming.status, incoming.id, orders );
			return { ...state, orders, columns };
		}

		default:
			return state;
	}
}