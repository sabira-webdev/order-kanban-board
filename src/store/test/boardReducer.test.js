import { describe, expect, it } from 'vitest';

import boardReducer, { hasExtraPages, initialState } from '../boardReducer';

const order = ( id, status, date ) => ( {
	id,
	number: String( id ),
	status,
	date,
	customer: `Customer ${ id }`,
} );

const column = ( status, orders, extra = {} ) => ( {
	status,
	label: status,
	color: '#000000',
	total: orders.length,
	page: 1,
	has_more: false,
	orders,
	...extra,
} );

// Order 1 is in On hold; orders 2 (newer) and 3 (older) are in Processing.
const board = {
	columns: [
		column( 'wc-on-hold', [
			order( 1, 'wc-on-hold', '2026-01-03T10:00:00+00:00' ),
		] ),
		column(
			'wc-processing',
			[
				order( 2, 'wc-processing', '2026-01-05T10:00:00+00:00' ),
				order( 3, 'wc-processing', '2026-01-01T10:00:00+00:00' ),
			],
			{ total: 3, has_more: true }
		),
		column( 'wc-completed', [] ),
	],
};

const loaded = () =>
	boardReducer( initialState, {
		type: 'LOAD_SUCCESS',
		board,
		receivedAt: 1000,
	} );

describe( 'boardReducer', () => {
	it( 'normalizes the board on LOAD_SUCCESS', () => {
		const state = loaded();

		expect( state.loadState ).toBe( 'ready' );
		expect( state.updatedAt ).toBe( 1000 );
		expect( state.search ).toBe( '' );
		expect( state.columnOrder ).toEqual( [
			'wc-on-hold',
			'wc-processing',
			'wc-completed',
		] );
		expect( state.columns[ 'wc-processing' ] ).toEqual( {
			status: 'wc-processing',
			label: 'wc-processing',
			color: '#000000',
			total: 3,
			page: 1,
			hasMore: true,
			orderIds: [ 2, 3 ],
		} );
		expect( Object.keys( state.orders ) ).toEqual( [ '1', '2', '3' ] );
		expect( state.orders[ 2 ].customer ).toBe( 'Customer 2' );
	} );

	it( 'moves a card, keeps the target column newest first and updates totals', () => {
		const state = boardReducer( loaded(), {
			type: 'MOVE',
			orderId: 1,
			from: 'wc-on-hold',
			to: 'wc-processing',
		} );

		expect( state.orders[ 1 ].status ).toBe( 'wc-processing' );
		expect( state.columns[ 'wc-on-hold' ].orderIds ).toEqual( [] );
		expect( state.columns[ 'wc-on-hold' ].total ).toBe( 0 );
		expect( state.columns[ 'wc-processing' ].orderIds ).toEqual( [
			2, 1, 3,
		] );
		expect( state.columns[ 'wc-processing' ].total ).toBe( 4 );
	} );

	it( 'restores the original state when from and to are swapped (undo)', () => {
		const before = loaded();
		const moved = boardReducer( before, {
			type: 'MOVE',
			orderId: 1,
			from: 'wc-on-hold',
			to: 'wc-processing',
		} );
		const undone = boardReducer( moved, {
			type: 'MOVE',
			orderId: 1,
			from: 'wc-processing',
			to: 'wc-on-hold',
		} );

		expect( undone ).toEqual( before );
	} );

	it( 'removes the card when moved to a status that is not on the board', () => {
		const state = boardReducer( loaded(), {
			type: 'MOVE',
			orderId: 2,
			from: 'wc-processing',
			to: 'wc-cancelled',
		} );

		expect( state.orders[ 2 ].status ).toBe( 'wc-cancelled' );
		expect( state.columns[ 'wc-processing' ].orderIds ).toEqual( [ 3 ] );
		expect( state.columns[ 'wc-processing' ].total ).toBe( 2 );
		expect( state.columns[ 'wc-cancelled' ] ).toBeUndefined();
	} );

	it( 'moves a card on UPSERT_ORDER when the server status differs', () => {
		const fromServer = {
			...order( 3, 'wc-completed', '2026-01-01T10:00:00+00:00' ),
			customer: 'Updated',
		};
		const state = boardReducer( loaded(), {
			type: 'UPSERT_ORDER',
			order: fromServer,
		} );

		expect( state.orders[ 3 ] ).toEqual( fromServer );
		expect( state.columns[ 'wc-processing' ].orderIds ).toEqual( [ 2 ] );
		expect( state.columns[ 'wc-completed' ].orderIds ).toEqual( [ 3 ] );
		expect( state.columns[ 'wc-completed' ].total ).toBe( 1 );
	} );

	it( 'appends a page without duplicates and reports extra pages', () => {
		const before = loaded();
		expect( hasExtraPages( before ) ).toBe( false );

		const page2 = column(
			'wc-processing',
			[
				order( 3, 'wc-processing', '2026-01-01T10:00:00+00:00' ), // Already shown.
				order( 4, 'wc-processing', '2025-12-30T10:00:00+00:00' ),
			],
			{ total: 3, page: 2, has_more: false }
		);
		const state = boardReducer( before, {
			type: 'APPEND_PAGE',
			column: page2,
		} );

		expect( state.columns[ 'wc-processing' ].orderIds ).toEqual( [
			2, 3, 4,
		] );
		expect( state.columns[ 'wc-processing' ].page ).toBe( 2 );
		expect( state.columns[ 'wc-processing' ].hasMore ).toBe( false );
		expect( state.orders[ 4 ].status ).toBe( 'wc-processing' );
		expect( hasExtraPages( state ) ).toBe( true );
	} );
} );
