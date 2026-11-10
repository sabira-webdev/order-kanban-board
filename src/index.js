import { createRoot } from '@wordpress/element';

import App from './App';

const container = document.getElementById( 'okb-root' );

if ( container ) {
	createRoot( container ).render( <App /> );
}