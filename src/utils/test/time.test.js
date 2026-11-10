import { describe, expect, it } from 'vitest';

import { timeAgo } from '../time';

const NOW = Date.UTC( 2026, 0, 15, 12, 0, 0 );
const options = { now: NOW, locale: 'en' };
const ago = ( seconds ) => new Date( NOW - seconds * 1000 ).toISOString();

describe( 'timeAgo', () => {
	it( 'says "now" for less than a minute ago', () => {
		expect( timeAgo( ago( 30 ), options ) ).toBe( 'now' );
	} );

	it( 'counts minutes', () => {
		expect( timeAgo( ago( 5 * 60 ), options ) ).toBe( '5 minutes ago' );
	} );

	it( 'counts hours', () => {
		expect( timeAgo( ago( 3 * 3600 ), options ) ).toBe( '3 hours ago' );
	} );

	it( 'says "yesterday" for one day ago', () => {
		expect( timeAgo( ago( 86400 ), options ) ).toBe( 'yesterday' );
	} );

	it( 'accepts a timestamp in milliseconds', () => {
		expect( timeAgo( NOW - 5 * 60 * 1000, options ) ).toBe(
			'5 minutes ago'
		);
	} );

	it( 'returns an empty string for an invalid date', () => {
		expect( timeAgo( 'not a date', options ) ).toBe( '' );
	} );
} );
