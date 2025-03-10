import { getLanguageRouteParam } from '@automattic/i18n-utils';
import page from 'page';
import { makeLayout, render as clientRender } from 'calypso/controller';
import { acceptInvite, redirectWithoutLocaleifLoggedIn } from './controller';

export default () => {
	const locale = getLanguageRouteParam( 'locale' );

	page(
		[
			`/accept-invite/:site_id/:invitation_key/${ locale }`,
			`/accept-invite/:site_id/:invitation_key/:activation_key/${ locale }`,
			`/accept-invite/:site_id/:invitation_key/:activation_key/:auth_key/${ locale }`,
		],
		redirectWithoutLocaleifLoggedIn,
		acceptInvite,
		makeLayout,
		clientRender
	);
};
