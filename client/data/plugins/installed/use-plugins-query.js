import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import wpcom from 'calypso/lib/wp';
import { receiveSitePlugins, updatePlugin } from 'calypso/state/plugins/installed/actions';

export function getInstalledPluginsCacheKey( siteIds ) {
	if ( siteIds.length === 1 ) {
		return [ 'plugins', siteIds[ 0 ] ];
	}
	// The `dev` and `view` query params are not included in the cache key because we want all
	// the hooks to have the same idea of what the current view is, regardless of dev flags.
	return [ 'all-plugins' ];
}

const usePluginsQuery = ( siteIds, queryOptions = {} ) => {
	// By default fetch plugins list from the cache site.
	let fetch = () => wpcom.req.get( '/me/sites/plugins' );
	const siteId = siteIds[ 0 ];

	if ( siteIds.length === 1 ) {
		// fetch the plugins list for only one site directly from the site.
		fetch = () => wpcom.site( siteId ).pluginsList();
	}

	const dispatch = useDispatch();
	return useQuery( getInstalledPluginsCacheKey( siteIds ), fetch, {
		...queryOptions,
		enabled: !! siteIds.length,
		onSuccess: ( data ) => {
			if ( data.sites ) {
				for ( const [ siteIdKey, plugins ] of Object.entries( data.sites ) ) {
					if ( ! Array.isArray( plugins ) ) {
						continue;
					}
					dispatch( receiveSitePlugins( siteIdKey, plugins ) );
				}
			} else {
				if ( ! Array.isArray( data.plugins ) ) {
					return null;
				}
				dispatch( receiveSitePlugins( siteId, data.plugins ) );
				data.plugins.map( ( plugin ) => {
					if ( plugin.update && plugin.autoupdate ) {
						dispatch( updatePlugin( siteId, plugin ) );
					}
				} );
			}
		},
	} );
};

export default usePluginsQuery;
