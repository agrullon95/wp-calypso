import { getCountryPostalCodeSupport } from '@automattic/wpcom-checkout';
import { useDispatch } from '@wordpress/data';
import debugFactory from 'debug';
import { useEffect, useRef } from 'react';
import { useSelector, useDispatch as useReduxDispatch } from 'react-redux';
import { requestContactDetailsCache } from 'calypso/state/domains/management/actions';
import getContactDetailsCache from 'calypso/state/selectors/get-contact-details-cache';
import useCountryList from './use-country-list';
import type {
	PossiblyCompleteDomainContactDetails,
	CountryListItem,
} from '@automattic/wpcom-checkout';

const debug = debugFactory( 'calypso:composite-checkout:use-cached-domain-contact-details' );

function useCachedContactDetails(): PossiblyCompleteDomainContactDetails | null {
	const reduxDispatch = useReduxDispatch();
	const haveRequestedCachedDetails = useRef< 'not-started' | 'pending' | 'done' >( 'not-started' );
	const cachedContactDetails = useSelector( getContactDetailsCache );
	useEffect( () => {
		if ( haveRequestedCachedDetails.current === 'not-started' ) {
			debug( 'requesting cached domain contact details' );
			reduxDispatch( requestContactDetailsCache() );
			haveRequestedCachedDetails.current = 'pending';
		}
	}, [ reduxDispatch ] );
	if ( haveRequestedCachedDetails.current === 'pending' && cachedContactDetails ) {
		debug( 'cached domain contact details retrieved', cachedContactDetails );
		haveRequestedCachedDetails.current = 'done';
	}
	return cachedContactDetails;
}

function useCachedContactDetailsForCheckoutForm(
	cachedContactDetails: PossiblyCompleteDomainContactDetails | null,
	overrideCountryList?: CountryListItem[]
): void {
	const countriesList = useCountryList( overrideCountryList );
	const previousDetailsForForm = useRef< PossiblyCompleteDomainContactDetails >();

	const arePostalCodesSupported =
		countriesList.length && cachedContactDetails?.countryCode
			? getCountryPostalCodeSupport( countriesList, cachedContactDetails.countryCode )
			: false;

	const checkoutStoreActions = useDispatch( 'wpcom-checkout' );
	if ( ! checkoutStoreActions?.loadDomainContactDetailsFromCache ) {
		throw new Error(
			'useCachedContactDetailsForCheckoutForm must be run after the checkout data store has been initialized'
		);
	}
	const { loadDomainContactDetailsFromCache } = checkoutStoreActions;

	// When we have fetched or loaded contact details, send them to the
	// `wpcom-checkout` data store for use by the checkout contact form.
	useEffect( () => {
		// Do nothing if the contact details are loading, or the countries are loading.
		if ( ! cachedContactDetails ) {
			debug( 'cached contact details for form have not loaded' );
			return;
		}
		if ( ! countriesList.length ) {
			debug( 'cached contact details for form are waiting for the countries list' );
			return;
		}
		// Do nothing if the cached data has not changed since the last time we
		// sent the data to the form (this typically will only ever need to be
		// activated once).
		if ( previousDetailsForForm.current === cachedContactDetails ) {
			debug( 'cached contact details for form have not changed' );
			return;
		}
		previousDetailsForForm.current = cachedContactDetails;
		debug( 'using fetched cached contact details for checkout data store', cachedContactDetails );
		loadDomainContactDetailsFromCache( {
			...cachedContactDetails,
			postalCode: arePostalCodesSupported ? cachedContactDetails.postalCode : '',
		} );
	}, [
		cachedContactDetails,
		arePostalCodesSupported,
		loadDomainContactDetailsFromCache,
		countriesList,
	] );
}

/**
 * Load cached contact details from the server and use them to populate the
 * checkout contact form and the shopping cart tax location.
 */
export default function useCachedDomainContactDetails(
	overrideCountryList?: CountryListItem[]
): void {
	const cachedContactDetails = useCachedContactDetails();
	useCachedContactDetailsForCheckoutForm( cachedContactDetails, overrideCountryList );
}
