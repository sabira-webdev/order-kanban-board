import { useEffect, useRef } from '@wordpress/element';

/**
 * Call `callback` every `seconds` while the tab is visible, and once
 * when the tab becomes visible again. Hidden tabs don't poll.
 *
 * @param {Function} callback Function to call.
 * @param {number}   seconds  Interval in seconds.
 */
export default function usePolling( callback, seconds ) {
	// Always call the latest callback without restarting the timer.
	const callbackRef = useRef( callback );
	useEffect( () => {
		callbackRef.current = callback;
	}, [ callback ] );

	useEffect( () => {
		if ( ! seconds ) {
			return;
		}

		let timer = null;

		const start = () => {
			if ( timer === null ) {
				timer = window.setInterval( () => callbackRef.current(), seconds * 1000 );
			}
		};

		const stop = () => {
			window.clearInterval( timer );
			timer = null;
		};

		const onVisibilityChange = () => {
			if ( document.hidden ) {
				stop();
			} else {
				callbackRef.current();
				start();
			}
		};

		if ( ! document.hidden ) {
			start();
		}
		document.addEventListener( 'visibilitychange', onVisibilityChange );

		return () => {
			stop();
			document.removeEventListener( 'visibilitychange', onVisibilityChange );
		};
	}, [ seconds ] );
}
