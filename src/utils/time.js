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
 * @param {string} date ISO date string.
 * @return {string} Relative time, or an empty string for invalid dates.
 */
export function timeAgo( date ) {
	const time = new Date( date ).getTime();
	if ( Number.isNaN( time ) ) {
		return '';
	}

	const lang = document.documentElement.lang || 'en';
	const rtf = new Intl.RelativeTimeFormat( lang, { numeric: 'auto' } );
	const seconds = ( time - Date.now() ) / 1000;

	for ( const [ unit, size ] of UNITS ) {
		if ( Math.abs( seconds ) >= size ) {
			return rtf.format( Math.round( seconds / size ), unit );
		}
	}

	return rtf.format( 0, 'second' );
}