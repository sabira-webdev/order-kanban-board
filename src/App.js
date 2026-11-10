import apiFetch from '@wordpress/api-fetch';
import { Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default function App() {
	const [ board, setBoard ] = useState( null );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		apiFetch( { path: '/okb/v1/board' } )
			.then( setBoard )
			.catch( setError );
	}, [] );

	if ( error ) {
		return <p>{ error.message }</p>;
	}

	if ( ! board ) {
		return <Spinner />;
	}

	return (
		<div>
			<h2>{ __( 'Order board', 'order-kanban-board' ) }</h2>
			<pre>{ JSON.stringify( board, null, 2 ) }</pre>
		</div>
	);
}