import { useEffect, useState } from '@wordpress/element';

/**
 * The value, but only after it has stopped changing for `delay` ms.
 *
 * @param {*}      value Value to debounce.
 * @param {number} delay Delay in milliseconds.
 * @return {*} Debounced value.
 */
export default function useDebouncedValue( value, delay ) {
	const [ debounced, setDebounced ] = useState( value );

	useEffect( () => {
		const timer = window.setTimeout( () => setDebounced( value ), delay );
		return () => window.clearTimeout( timer );
	}, [ value, delay ] );

	return debounced;
}
