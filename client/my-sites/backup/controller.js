import { isJetpackBackupSlug, WPCOM_FEATURES_BACKUPS } from '@automattic/calypso-products';
import Debug from 'debug';
import QueryRewindState from 'calypso/components/data/query-rewind-state';
import FormattedHeader from 'calypso/components/formatted-header';
import BackupPlaceholder from 'calypso/components/jetpack/backup-placeholder';
import HasVaultPressSwitch from 'calypso/components/jetpack/has-vaultpress-switch';
import IsCurrentUserAdminSwitch from 'calypso/components/jetpack/is-current-user-admin-switch';
import IsJetpackDisconnectedSwitch from 'calypso/components/jetpack/is-jetpack-disconnected-switch';
import NotAuthorizedPage from 'calypso/components/jetpack/not-authorized-page';
import UpsellSwitch from 'calypso/components/jetpack/upsell-switch';
import SidebarNavigation from 'calypso/components/sidebar-navigation';
import isJetpackCloud from 'calypso/lib/jetpack/is-jetpack-cloud';
import { setFilter } from 'calypso/state/activity-log/actions';
import getRewindState from 'calypso/state/selectors/get-rewind-state';
import siteHasFeature from 'calypso/state/selectors/site-has-feature';
import isJetpackSiteMultiSite from 'calypso/state/sites/selectors/is-jetpack-site-multi-site';
import getSelectedSiteId from 'calypso/state/ui/selectors/get-selected-site-id';
import BackupUpsell from './backup-upsell';
import BackupsPage from './main';
import BackupRewindFlow, { RewindFlowPurpose } from './rewind-flow';
import WPCOMBackupUpsell from './wpcom-backup-upsell';

const debug = new Debug( 'calypso:my-sites:backup:controller' );

export function showUpsellIfNoBackup( context, next ) {
	debug( 'controller: showUpsellIfNoBackup', context.params );

	const UpsellComponent = isJetpackCloud() ? BackupUpsell : WPCOMBackupUpsell;
	context.primary = (
		<>
			<UpsellSwitch
				UpsellComponent={ UpsellComponent }
				QueryComponent={ QueryRewindState }
				getStateForSite={ getRewindState }
				isRequestingForSite={ ( state, siteId ) =>
					'uninitialized' === getRewindState( state, siteId )?.state
				}
				display={ context.primary }
				productSlugTest={ isJetpackBackupSlug }
			>
				{ isJetpackCloud() && <SidebarNavigation /> }
				{ ! isJetpackCloud() && (
					<FormattedHeader brandFont headerText="Jetpack Backup" align="left" />
				) }
				<BackupPlaceholder />
			</UpsellSwitch>
		</>
	);
	next();
}

export function showJetpackIsDisconnected( context, next ) {
	debug( 'controller: showJetpackIsDisconnected', context.params );

	const JetpackConnectionFailed = isJetpackCloud() ? (
		<BackupUpsell reason="no_connected_jetpack" />
	) : (
		<WPCOMBackupUpsell reason="no_connected_jetpack" />
	);
	context.primary = (
		<IsJetpackDisconnectedSwitch
			trueComponent={ JetpackConnectionFailed }
			falseComponent={ context.primary }
		/>
	);
	next();
}

export function showNotAuthorizedForNonAdmins( context, next ) {
	context.primary = (
		<IsCurrentUserAdminSwitch
			trueComponent={ context.primary }
			falseComponent={ <NotAuthorizedPage /> }
		/>
	);

	next();
}

export function showUnavailableForVaultPressSites( context, next ) {
	debug( 'controller: showUnavailableForVaultPressSites', context.params );

	const message = isJetpackCloud() ? (
		<BackupUpsell reason="vp_active_on_site" />
	) : (
		<WPCOMBackupUpsell reason="vp_active_on_site" />
	);

	context.primary = (
		<HasVaultPressSwitch trueComponent={ message } falseComponent={ context.primary } />
	);

	next();
}

export function showUnavailableForMultisites( context, next ) {
	debug( 'controller: showUnavailableForMultisites', context.params );

	const state = context.store.getState();
	const siteId = getSelectedSiteId( state );

	if (
		isJetpackSiteMultiSite( state, siteId ) &&
		! siteHasFeature( state, siteId, WPCOM_FEATURES_BACKUPS )
	) {
		// Only show "Multisite not supported" card if the multisite does Not already own a Backup subscription.
		// https://href.li/?https://wp.me/pbuNQi-1jg
		context.primary = isJetpackCloud() ? (
			<BackupUpsell reason="multisite_not_supported" />
		) : (
			<WPCOMBackupUpsell reason="multisite_not_supported" />
		);
	}

	next();
}

/* handles /backup/:site, see `backupMainPath` */
export function backups( context, next ) {
	debug( 'controller: backups', context.params );

	// When a user visits `/backup`, we don't want to carry over any filter
	// selection that could've happened in the Activity Log, otherwise,
	// the app will render the `SearchResults` component instead of the
	// `BackupStatus`.
	const state = context.store.getState();
	const siteId = getSelectedSiteId( state );
	context.store.dispatch( setFilter( siteId, {}, true ) );

	const { date } = context.query;

	context.primary = <BackupsPage queryDate={ date } />;
	next();
}

/* handles /backup/:site/download/:rewindId, see `backupDownloadPath` */
export function backupDownload( context, next ) {
	debug( 'controller: backupDownload', context.params );

	context.primary = (
		<BackupRewindFlow rewindId={ context.params.rewindId } purpose={ RewindFlowPurpose.DOWNLOAD } />
	);
	next();
}

/* handles /backup/:site/restore/:rewindId, see `backupRestorePath` */
export function backupRestore( context, next ) {
	debug( 'controller: backupRestore', context.params );

	context.primary = (
		<BackupRewindFlow rewindId={ context.params.rewindId } purpose={ RewindFlowPurpose.RESTORE } />
	);
	next();
}
