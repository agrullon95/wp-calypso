import config from '@automattic/calypso-config';
import { getLanguageSlugs } from '@automattic/i18n-utils';
import { translate } from 'i18n-calypso';
import page from 'page';
import { QueryClientProvider } from 'react-query';
import { Provider as ReduxProvider } from 'react-redux';
import CalypsoI18nProvider from 'calypso/components/calypso-i18n-provider';
import EmptyContent from 'calypso/components/empty-content';
import MomentProvider from 'calypso/components/localized-moment/provider';
import { RouteProvider } from 'calypso/components/route';
import Layout from 'calypso/layout';
import LayoutLoggedOut from 'calypso/layout/logged-out';
import { login } from 'calypso/lib/paths';
import { CalypsoReactQueryDevtools } from 'calypso/lib/react-query-devtools-helper';
import { getSiteFragment } from 'calypso/lib/route';
import { isUserLoggedIn } from 'calypso/state/current-user/selectors';
import {
	getImmediateLoginEmail,
	getImmediateLoginLocale,
} from 'calypso/state/immediate-login/selectors';
import { makeLayoutMiddleware } from './shared.js';
import { render, hydrate } from './web-util.js';

/**
 * Re-export
 */
export { setSectionMiddleware, setLocaleMiddleware } from './shared.js';
export { render, hydrate } from './web-util.js';

export const ProviderWrappedLayout = ( {
	store,
	queryClient,
	currentSection,
	currentRoute,
	currentQuery,
	primary,
	secondary,
	redirectUri,
} ) => {
	const state = store.getState();
	const userLoggedIn = isUserLoggedIn( state );

	const layout = userLoggedIn ? (
		<Layout primary={ primary } secondary={ secondary } />
	) : (
		<LayoutLoggedOut primary={ primary } secondary={ secondary } redirectUri={ redirectUri } />
	);

	return (
		<CalypsoI18nProvider>
			<RouteProvider
				currentSection={ currentSection }
				currentRoute={ currentRoute }
				currentQuery={ currentQuery }
			>
				<QueryClientProvider client={ queryClient }>
					<ReduxProvider store={ store }>
						<MomentProvider>{ layout }</MomentProvider>
					</ReduxProvider>
					<CalypsoReactQueryDevtools />
				</QueryClientProvider>
			</RouteProvider>
		</CalypsoI18nProvider>
	);
};

export const makeLayout = makeLayoutMiddleware( ProviderWrappedLayout );

/**
 * For logged in users with bootstrap (production), ReactDOM.hydrate().
 * Otherwise (development), ReactDOM.render().
 * See: https://wp.me/pd2qbF-P#comment-20
 *
 * @param context - Middleware context
 */
function smartHydrate( context ) {
	const doHydrate =
		! config.isEnabled( 'wpcom-user-bootstrap' ) && isUserLoggedIn( context.store.getState() )
			? render
			: hydrate;

	doHydrate( context );
}

/**
 * Isomorphic routing helper, client side
 *
 * @param { string } route - A route path
 * @param {...Function} middlewares - Middleware to be invoked for route
 *
 * This function is passed to individual sections' controllers via
 * `server/bundler/loader`. Sections are free to either ignore it, or use it
 * instead of directly calling `page` for linking routes and middlewares in
 * order to be also usable for server-side rendering (and isomorphic routing).
 * `clientRouter` then also renders the element tree contained in `context.layout`
 * (or, if that is empty, in `context.primary`) to the respectively corresponding
 * divs.
 */
export function clientRouter( route, ...middlewares ) {
	page( route, ...middlewares, smartHydrate );
}

export function redirectLoggedOut( context, next ) {
	const state = context.store.getState();
	const userLoggedOut = ! isUserLoggedIn( state );

	if ( userLoggedOut ) {
		const siteFragment = context.params.site || getSiteFragment( context.path );

		const loginParameters = {
			redirectTo: context.path,
			site: siteFragment,
		};

		// Pass along "login_email" and "login_locale" parameters from the
		// original URL, to ensure the login form is pre-filled with the
		// correct email address and built with the correct language (when
		// either of those are requested).
		const login_email = getImmediateLoginEmail( state );
		if ( login_email ) {
			loginParameters.emailAddress = login_email;
		}
		const login_locale = getImmediateLoginLocale( state );
		if ( login_locale ) {
			loginParameters.locale = login_locale;
		}

		// force full page reload to avoid SSR hydration issues.
		window.location = login( loginParameters );
		return;
	}
	next();
}

/**
 * Removes the locale param from the path and redirects logged-in users to it.
 *
 * @param   {Object}   context Context object
 * @param   {Function} next    Calls next middleware
 * @returns {void}
 */
export function redirectWithoutLocaleParamIfLoggedIn( context, next ) {
	const langSlugs = getLanguageSlugs();
	const langSlugPathSegmentMatcher = new RegExp( `\\/(${ langSlugs.join( '|' ) })(\\/|\\?|$)` );
	const pathWithoutLocale = context.path.replace( langSlugPathSegmentMatcher, '$2' );

	if ( isUserLoggedIn( context.store.getState() ) && pathWithoutLocale !== context.path ) {
		return page.redirect( pathWithoutLocale );
	}

	next();
}

export const notFound = ( context, next ) => {
	/* eslint-disable wpcalypso/jsx-classname-namespace */
	context.primary = (
		<EmptyContent
			className="content-404"
			illustration="/calypso/images/illustrations/illustration-404.svg"
			title={ translate( 'Uh oh. Page not found.' ) }
			line={ translate( "Sorry, the page you were looking for doesn't exist or has been moved." ) }
		/>
	);
	/* eslint-enable wpcalypso/jsx-classname-namespace */

	next();
};
