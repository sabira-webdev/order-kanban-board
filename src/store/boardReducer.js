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
	// The search the loaded board shows ('' for the normal board).
	search: '',
	// When the board was last loaded (ms timestamp).
	updatedAt: null,
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
			page: column.page || 1,
			hasMore: Boolean( column.has_more ),
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

/**
 * True when any column shows more than its first page.
 *
 * @param {Object} state Board state.
 * @return {boolean} Whether extra pages are loaded.
 */
export function hasExtraPages( state ) {
	return state.columnOrder.some( ( status ) => state.columns[ status ]?.page > 1 );
}

export default function boardReducer( state, action ) {
	switch ( action.type ) {
		case 'LOAD_START':
			return { ...state, loadState: 'loading', error: null };

		case 'LOAD_SUCCESS':
			return {
				...state,
				...normalizeBoard( action.board ),
				search: action.board.search || '',
				updatedAt: action.receivedAt,
				loadState: 'ready',
				error: null,
			};

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

		// Add the next page of a column below the orders already shown.
		case 'APPEND_PAGE': {
			const { status } = action.column;
			const column = state.columns[ status ];
			if ( ! column ) {
				return state;
			}

			const orders = { ...state.orders };
			const newIds = [];
			for ( const order of action.column.orders ) {
				const known = state.orders[ order.id ];
				// Skip duplicates, and orders that were moved to another column here.
				if ( column.orderIds.includes( order.id ) || ( known && known.status !== status ) ) {
					continue;
				}
				if ( ! known ) {
					orders[ order.id ] = order;
				}
				newIds.push( order.id );
			}

			return {
				...state,
				orders,
				columns: {
					...state.columns,
					[ status ]: {
						...column,
						total: action.column.total,
						page: action.column.page,
						hasMore: Boolean( action.column.has_more ),
						orderIds: [ ...column.orderIds, ...newIds ].sort( byNewest( orders ) ),
					},
				},
			};
		}

		default:
			return state;
	}
}
