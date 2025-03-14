import config from '@automattic/calypso-config';
import { getLocaleSlug } from 'i18n-calypso';
import { useQuery } from 'react-query';
import wpcomRequest from 'wpcom-proxy-request';
import type { HappychatSession, HappychatUser, User, HappychatAuth } from './types';

export async function requestHappyChatAuth() {
	const user: User = await wpcomRequest( {
		path: '/me',
		apiVersion: '1.1',
	} );

	const url: string = config( 'happychat_url' );
	const locale = getLocaleSlug();

	const happychatUser: HappychatUser = {
		signer_user_id: user.ID,
		locale,
		groups: [ 'WP.com' ],
		skills: {
			product: [ 'WP.com' ],
		},
	};
	const session: HappychatSession = await wpcomRequest( {
		path: '/happychat/session',
		apiVersion: '1.1',
		method: 'POST',
	} );
	const { session_id, geo_location } = session;
	happychatUser.geoLocation = geo_location;

	const sign: { jwt: string } = await wpcomRequest( {
		path: '/jwt/sign',
		apiVersion: '1.1',
		method: 'POST',
		body: { payload: JSON.stringify( { user, session_id } ) },
	} );

	const { jwt } = sign;

	return { url, user: { jwt, ...happychatUser }, fullUser: user };
}

export default function useHappychatAuth( enabled = true ) {
	return useQuery< HappychatAuth, typeof Error >( 'getHappychatAuth', requestHappyChatAuth, {
		refetchOnWindowFocus: false,
		keepPreviousData: true,
		enabled,
	} );
}
