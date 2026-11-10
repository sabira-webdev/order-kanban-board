const UNITS = [
	[ 'year', 31536000 ],
	[ 'month', 2592000 ],
	[ 'week', 604800 ],
	[ 'day', 86400 ],
	[ 'hour', 3600 ],
	[ 'minute', 60 ],
];

/**
 * Short relative time, e.g. "3 hours ago" or "yesterday".
 *
 * @param {string|number} date             ISO date string or timestamp in milliseconds.
 * @param {Object}        [options]        Options, mainly for tests.
 * @param {number}        [options.now]    Current time in milliseconds. Default: Date.now().
 * @param {string}        [options.locale] Locale. Default: the page language, or "en".
 * @return {string} Relative time, or an empty string for invalid dates.
 */
export function timeAgo( date, { now = Date.now(), locale } = {} ) {
	const time = new Date( date ).getTime();
	if ( Number.isNaN( time ) ) {
		return '';
	}

	const lang =
		locale ||
		( typeof document !== 'undefined' && document.documentElement.lang ) ||
		'en';
	const rtf = new Intl.RelativeTimeFormat( lang, { numeric: 'auto' } );
	const seconds = ( time - now ) / 1000;

	for ( const [ unit, size ] of UNITS ) {
		if ( Math.abs( seconds ) >= size ) {
			return rtf.format( Math.round( seconds / size ), unit );
		}
	}

	return rtf.format( 0, 'second' );
}
