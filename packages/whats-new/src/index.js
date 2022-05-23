import apiFetch from '@wordpress/api-fetch';
import { Guide } from '@wordpress/components';
import { useI18n } from '@wordpress/react-i18n';
import { useEffect, useState } from 'react';
import WhatsNewPage from './whats-new-page';
import './style.scss';

const WhatsNewGuide = ( { onClose } ) => {
	const [ whatsNewData, setWhatsNewData ] = useState( null );
	const __ = useI18n().__;

	// Load What's New list on first site load
	useEffect( () => {
		apiFetch( { path: `/wpcom/v2/whats-new/announcements` } ).then( ( returnedList ) => {
			setWhatsNewData( returnedList );
		} );
	} );
	if ( ! whatsNewData ) {
		return null;
	}

	return (
		<Guide
			// eslint-disable-next-line wpcalypso/jsx-classname-namespace
			className="whats-new-guide__main"
			contentLabel={ __( "What's New at WordPress.com", __i18n_text_domain__ ) }
			finishButtonText={ __( 'Close', __i18n_text_domain__ ) }
			onFinish={ onClose }
		>
			{ whatsNewData.map( ( page, index ) => (
				<WhatsNewPage
					pageNumber={ index + 1 }
					isLastPage={ index === whatsNewData.length - 1 }
					description={ page.description }
					heading={ page.heading }
					imageSrc={ page.imageSrc }
					link={ page.link }
				/>
			) ) }
		</Guide>
	);
};

export default WhatsNewGuide;
