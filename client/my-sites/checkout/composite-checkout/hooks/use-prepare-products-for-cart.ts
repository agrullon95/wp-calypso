import {
	JETPACK_SEARCH_PRODUCTS,
	PRODUCT_JETPACK_SEARCH,
	PRODUCT_JETPACK_SEARCH_MONTHLY,
	PRODUCT_WPCOM_SEARCH,
	PRODUCT_WPCOM_SEARCH_MONTHLY,
	getPlanByPathSlug,
} from '@automattic/calypso-products';
import { createRequestCartProduct } from '@automattic/shopping-cart';
import { decodeProductFromUrl, isValueTruthy } from '@automattic/wpcom-checkout';
import debugFactory from 'debug';
import { useTranslate } from 'i18n-calypso';
import { useEffect, useMemo, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { getSelectedSiteSlug } from 'calypso/state/ui/selectors';
import getCartFromLocalStorage from '../lib/get-cart-from-local-storage';
import useFetchProductsIfNotLoaded from './use-fetch-products-if-not-loaded';
import useStripProductsFromUrl from './use-strip-products-from-url';
import type { RequestCartProduct } from '@automattic/shopping-cart';

const debug = debugFactory( 'calypso:composite-checkout:use-prepare-products-for-cart' );

interface PreparedProductsForCart {
	productsForCart: RequestCartProduct[];
	isLoading: boolean;
	error: string | null;
}

const initialPreparedProductsState = {
	isLoading: true,
	productsForCart: [],
	error: null,
};

export default function usePrepareProductsForCart( {
	productAliasFromUrl,
	purchaseId: originalPurchaseId,
	isInModal,
	usesJetpackProducts,
	isPrivate,
	siteSlug,
	isLoggedOutCart,
	isNoSiteCart,
	isJetpackCheckout,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	source,
}: {
	productAliasFromUrl: string | null | undefined;
	purchaseId: string | number | null | undefined;
	isInModal?: boolean;
	usesJetpackProducts: boolean;
	isPrivate: boolean;
	siteSlug: string | undefined;
	isLoggedOutCart?: boolean;
	isNoSiteCart?: boolean;
	isJetpackCheckout?: boolean;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	source?: string;
} ): PreparedProductsForCart {
	const [ state, dispatch ] = useReducer( preparedProductsReducer, initialPreparedProductsState );

	debug(
		'preparing products for cart from url string',
		productAliasFromUrl,
		'and purchase id',
		originalPurchaseId,
		'and isLoggedOutCart',
		isLoggedOutCart,
		'and isNoSiteCart',
		isNoSiteCart,
		'and isJetpackCheckout',
		isJetpackCheckout,
		'and jetpackSiteSlug',
		jetpackSiteSlug,
		'and jetpackPurchaseToken',
		jetpackPurchaseToken
	);

	useFetchProductsIfNotLoaded();

	const addHandler = chooseAddHandler( {
		isLoading: state.isLoading,
		originalPurchaseId,
		productAliasFromUrl,
		isLoggedOutCart,
		isNoSiteCart,
		isJetpackCheckout,
	} );
	debug( 'isLoading', state.isLoading );
	debug( 'handler is', addHandler );

	// Only one of these should ever operate. The others should bail if they
	// think another hook will handle the data.
	useAddProductsFromLocalStorage( {
		dispatch,
		addHandler,
	} );
	useAddProductFromSlug( {
		productAliasFromUrl,
		dispatch,
		usesJetpackProducts,
		isPrivate,
		addHandler,
		isJetpackCheckout,
		jetpackSiteSlug,
		jetpackPurchaseToken,
		source,
	} );
	useAddRenewalItems( {
		originalPurchaseId,
		productAlias: productAliasFromUrl,
		dispatch,
		addHandler,
	} );
	useNothingToAdd( { addHandler, dispatch } );

	// Do not strip products from url until the URL has been parsed
	const areProductsRetrievedFromUrl = ! state.isLoading && ! isInModal;
	const doNotStripProducts = Boolean( ! areProductsRetrievedFromUrl || isJetpackCheckout );
	useStripProductsFromUrl( siteSlug, doNotStripProducts );

	return state;
}

type PreparedProductsAction =
	| { type: 'PRODUCTS_ADD'; products: RequestCartProduct[] }
	| { type: 'RENEWALS_ADD'; products: RequestCartProduct[] }
	| { type: 'PRODUCTS_ADD_ERROR'; message: string };

function preparedProductsReducer(
	state: PreparedProductsForCart,
	action: PreparedProductsAction
): PreparedProductsForCart {
	switch ( action.type ) {
		case 'RENEWALS_ADD':
		// fall through
		case 'PRODUCTS_ADD':
			if ( ! state.isLoading ) {
				return state;
			}
			return { ...state, productsForCart: action.products, isLoading: false };
		case 'PRODUCTS_ADD_ERROR':
			if ( ! state.isLoading ) {
				return state;
			}
			return { ...state, isLoading: false, error: action.message };
		default:
			return state;
	}
}

type AddHandler = 'addProductFromSlug' | 'addRenewalItems' | 'doNotAdd' | 'addFromLocalStorage';

function chooseAddHandler( {
	isLoading,
	originalPurchaseId,
	productAliasFromUrl,
	isLoggedOutCart,
	isNoSiteCart,
	isJetpackCheckout,
}: {
	isLoading: boolean;
	originalPurchaseId: string | number | null | undefined;
	productAliasFromUrl: string | null | undefined;
	isLoggedOutCart?: boolean;
	isNoSiteCart?: boolean;
	isJetpackCheckout?: boolean;
} ): AddHandler {
	if ( isJetpackCheckout ) {
		return 'addProductFromSlug';
	}

	if ( ! isLoading ) {
		return 'doNotAdd';
	}

	if ( isLoggedOutCart || isNoSiteCart ) {
		return 'addFromLocalStorage';
	}

	if ( originalPurchaseId ) {
		return 'addRenewalItems';
	}

	if ( ! originalPurchaseId && productAliasFromUrl ) {
		return 'addProductFromSlug';
	}

	return 'doNotAdd';
}

function useNothingToAdd( {
	dispatch,
	addHandler,
}: {
	dispatch: ( action: PreparedProductsAction ) => void;
	addHandler: AddHandler;
} ) {
	useEffect( () => {
		if ( addHandler !== 'doNotAdd' ) {
			return;
		}

		debug( 'nothing to add' );
		dispatch( { type: 'PRODUCTS_ADD', products: [] } );
	}, [ addHandler, dispatch ] );
}

function useAddProductsFromLocalStorage( {
	dispatch,
	addHandler,
}: {
	dispatch: ( action: PreparedProductsAction ) => void;
	addHandler: AddHandler;
} ) {
	const translate = useTranslate();

	useEffect( () => {
		if ( addHandler !== 'addFromLocalStorage' ) {
			return;
		}

		const productsForCart: RequestCartProduct[] = getCartFromLocalStorage().map( ( product ) =>
			createRequestCartProduct( product )
		);

		if ( productsForCart.length < 1 ) {
			debug( 'creating products from localStorage failed' );
			dispatch( {
				type: 'PRODUCTS_ADD_ERROR',
				message: String( translate( 'I tried and failed to create products from signup' ) ),
			} );
			return;
		}

		debug( 'preparing products requested in localStorage', productsForCart );
		dispatch( { type: 'PRODUCTS_ADD', products: productsForCart } );
	}, [ addHandler, dispatch, translate ] );
}

function useAddRenewalItems( {
	originalPurchaseId,
	productAlias,
	dispatch,
	addHandler,
}: {
	originalPurchaseId: string | number | null | undefined;
	productAlias: string | null | undefined;
	dispatch: ( action: PreparedProductsAction ) => void;
	addHandler: AddHandler;
} ) {
	const selectedSiteSlug = useSelector( getSelectedSiteSlug );
	const translate = useTranslate();

	useEffect( () => {
		if ( addHandler !== 'addRenewalItems' ) {
			return;
		}
		const productSlugs = productAlias?.split( ',' ) ?? [];
		const purchaseIds = originalPurchaseId ? String( originalPurchaseId ).split( ',' ) : [];

		const productsForCart = purchaseIds
			.map( ( subscriptionId, currentIndex ) => {
				const productSlug = productSlugs[ currentIndex ];
				if ( ! productSlug ) {
					return null;
				}
				return createRenewalItemToAddToCart( productSlug, subscriptionId );
			} )
			.filter( isValueTruthy );

		if ( productsForCart.length < 1 ) {
			debug( 'creating renewal products failed', productAlias );
			dispatch( {
				type: 'PRODUCTS_ADD_ERROR',
				message: String(
					translate(
						"I tried and failed to create products matching the identifier '%(productAlias)s'",
						{
							args: { productAlias },
						}
					)
				),
			} );
			return;
		}
		debug( 'preparing renewals requested in url', productsForCart );
		dispatch( { type: 'RENEWALS_ADD', products: productsForCart } );
	}, [ addHandler, translate, originalPurchaseId, productAlias, dispatch, selectedSiteSlug ] );
}

function useAddProductFromSlug( {
	productAliasFromUrl,
	dispatch,
	usesJetpackProducts,
	isPrivate,
	addHandler,
	isJetpackCheckout,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	source,
}: {
	productAliasFromUrl: string | undefined | null;
	dispatch: ( action: PreparedProductsAction ) => void;
	usesJetpackProducts: boolean;
	isPrivate: boolean;
	addHandler: AddHandler;
	isJetpackCheckout?: boolean;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	source?: string;
} ) {
	const translate = useTranslate();

	// If `productAliasFromUrl` has a comma ',' in it, we will assume it's because it's
	// referencing more than one product. Because of this, the rest of this function will
	// work with an array of products even if `productAliasFromUrl` includes only one.
	const validProducts = useMemo(
		() =>
			productAliasFromUrl
				?.split( ',' )
				// Special treatment for Jetpack Search products
				.map( ( productAlias ) => getJetpackSearchForSite( productAlias, usesJetpackProducts ) )
				// Get the product information if it exists, and keep a reference to
				// its product alias which we may need to get additional information like
				// the domain name or theme (eg: 'theme:ovation').
				.map( ( productAlias ) => {
					const productSlug = getProductSlugFromAlias( productAlias );
					return { productSlug, productAlias };
				} ) ?? [],
		[ usesJetpackProducts, productAliasFromUrl ]
	);

	useEffect( () => {
		if ( addHandler !== 'addProductFromSlug' ) {
			return;
		}

		const cartProducts = validProducts.map( ( product ) =>
			// Transform the product data into a RequestCartProduct
			createItemToAddToCart( {
				productSlug: product.productSlug,
				productAlias: product.productAlias,
				isJetpackCheckout,
				jetpackSiteSlug,
				jetpackPurchaseToken,
				source,
			} )
		);

		if ( cartProducts.length < 1 ) {
			debug(
				'there is a request to add a one or more products but creating them failed',
				productAliasFromUrl
			);
			dispatch( {
				type: 'PRODUCTS_ADD_ERROR',
				message: String(
					translate(
						"I tried and failed to create products matching the identifier '%(productAlias)s'",
						{
							args: { productAlias: productAliasFromUrl },
						}
					)
				),
			} );
			return;
		}
		debug(
			'preparing products that were requested in url',
			{ productAliasFromUrl, usesJetpackProducts },
			cartProducts
		);
		dispatch( { type: 'PRODUCTS_ADD', products: cartProducts } );
	}, [
		addHandler,
		translate,
		isPrivate,
		usesJetpackProducts,
		productAliasFromUrl,
		validProducts,
		isJetpackCheckout,
		dispatch,
		jetpackSiteSlug,
		jetpackPurchaseToken,
		source,
	] );
}

// Transform a fake slug like 'theme:ovation' into a real slug like 'premium_theme'
function getProductSlugFromAlias( productAlias: string ): string {
	const [ encodedAlias ] = productAlias.split( ':' );
	// Some product slugs contain slashes, so we decode them
	const decodedAlias = decodeProductFromUrl( encodedAlias );
	if ( decodedAlias === 'domain-mapping' ) {
		return 'domain_map';
	}
	if ( decodedAlias === 'no-ads' ) {
		return 'no-adverts/no-adverts.php';
	}
	if ( decodedAlias === 'theme' ) {
		return 'premium_theme';
	}
	const plan = getPlanByPathSlug( decodedAlias );
	const planSlug = plan?.getStoreSlug();
	if ( planSlug ) {
		return planSlug;
	}
	return decodedAlias;
}

function createRenewalItemToAddToCart(
	productAlias: string,
	purchaseId: string | number | undefined | null
): RequestCartProduct | null {
	const [ slug, meta ] = productAlias.split( ':' );
	// Some product slugs contain slashes, so we decode them
	const productSlug = decodeProductFromUrl( slug );

	if ( ! purchaseId ) {
		return null;
	}

	const renewalItemExtra = {
		purchaseId: String( purchaseId ),
		purchaseType: 'renewal',
	};
	return {
		// Some meta values include slashes, so we decode them
		meta: meta ? decodeProductFromUrl( meta ) : '',
		quantity: null,
		volume: 1,
		product_slug: productSlug,
		extra: renewalItemExtra,
	};
}

/*
 * Provides an special handling for search products: Always add Jetpack Search to
 * Jetpack sites and WPCOM Search to WordPress.com sites, regardless of
 * which slug was provided. This allows e.g. code on jetpack.com to
 * redirect to a valid checkout URL for a search purchase without worrying
 * about which type of site the user has.
 */
function getJetpackSearchForSite( productAlias: string, usesJetpackProducts: boolean ): string {
	if (
		productAlias &&
		JETPACK_SEARCH_PRODUCTS.includes( productAlias as typeof JETPACK_SEARCH_PRODUCTS[ number ] )
	) {
		if ( usesJetpackProducts ) {
			productAlias = productAlias.includes( 'monthly' )
				? PRODUCT_JETPACK_SEARCH_MONTHLY
				: PRODUCT_JETPACK_SEARCH;
		} else {
			productAlias = productAlias.includes( 'monthly' )
				? PRODUCT_WPCOM_SEARCH_MONTHLY
				: PRODUCT_WPCOM_SEARCH;
		}
	}
	return productAlias;
}

function createItemToAddToCart( {
	productSlug,
	productAlias,
	isJetpackCheckout,
	jetpackSiteSlug,
	jetpackPurchaseToken,
	source,
}: {
	productSlug: string;
	productAlias: string;
	isJetpackCheckout?: boolean;
	jetpackSiteSlug?: string;
	jetpackPurchaseToken?: string;
	source?: string;
} ): RequestCartProduct {
	// Allow setting meta (theme name or domain name) from products in the URL by
	// using a colon between the product slug and the meta.
	const [ , meta ] = productAlias.split( ':' );
	// Some meta values contain slashes, so we decode them
	const cartMeta = meta ? decodeProductFromUrl( meta ) : '';

	debug( 'creating product with', productSlug, 'from alias', productAlias, 'with meta', cartMeta );

	return createRequestCartProduct( {
		product_slug: productSlug,
		extra: {
			isJetpackCheckout,
			jetpackSiteSlug,
			jetpackPurchaseToken,
			context: 'calypstore',
			source: source ?? undefined,
		},
		...( cartMeta ? { meta: cartMeta } : {} ),
	} );
}
