import apiFetch from '@wordpress/api-fetch';
import { Notice, Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import Board from './components/Board';

export default function App() {
	const [ board, setBoard ] = useState( null );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		apiFetch( { path: '/okb/v1/board' } )
			.then( setBoard )
			.catch( setError );
	}, [] );

	return (
		<div className="okb-app">
			<h2 className="okb-app__title">{ __( 'Order board', 'order-kanban-board' ) }</h2>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error.message }
				</Notice>
			) }

			{ ! board && ! error && <Spinner /> }

			{ board && <Board columns={ board.columns } /> }
		</div>
	);
}