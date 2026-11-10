import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';

/**
 * Load full details for one order. Reloads when its status changes.
 *
 * @param {number} orderId Order ID.
 * @param {string} status  Current status, so details reload after a move.
 * @return {Object} { details, error, isLoading, setDetails }
 */
export default function useOrderDetails( orderId, status ) {
	const [ details, setDetails ] = useState( null );
	const [ error, setError ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( false );

	useEffect( () => {
		const controller = new window.AbortController();
		setIsLoading( true );
		setError( null );

		apiFetch( {
			path: `/okb/v1/orders/${ orderId }`,
			signal: controller.signal,
		} )
			.then( ( data ) => {
				setDetails( data );
				setIsLoading( false );
			} )
			.catch( ( err ) => {
				if ( err?.name !== 'AbortError' ) {
					setError( err );
					setIsLoading( false );
				}
			} );

		// If the panel closes or another order opens, cancel the old request.
		return () => controller.abort();
	}, [ orderId, status ] );

	return { details, error, isLoading, setDetails };
}
