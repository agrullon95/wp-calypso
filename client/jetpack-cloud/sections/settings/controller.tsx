import AdvancedCredentials from 'calypso/components/advanced-credentials';
import HasSitePurchasesSwitch from 'calypso/components/has-site-purchases-switch';
import IsCurrentUserAdminSwitch from 'calypso/components/jetpack/is-current-user-admin-switch';
import NotAuthorizedPage from 'calypso/components/jetpack/not-authorized-page';
import DisconnectSite from 'calypso/my-sites/site-settings/disconnect-site';
import ConfirmDisconnection from 'calypso/my-sites/site-settings/disconnect-site/confirm';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import NoSitesPurchasesMessage from './empty-content';
import HasSiteCredentialsSwitch from './has-site-credentials-switch';
import AdvancedCredentialsLoadingPlaceholder from './loading';
import SettingsPage from './main';

export const settings: PageJS.Callback = ( context, next ) => {
	context.primary = <SettingsPage />;
	next();
};

export const advancedCredentials: PageJS.Callback = ( context, next ) => {
	const { host, action } = context.query;
	const siteId = getSelectedSiteId( context.store.getState() ) as number;
	const sectionElt = <AdvancedCredentials action={ action } host={ host } role="main" />;

	context.primary = (
		<HasSiteCredentialsSwitch
			siteId={ siteId }
			trueComponent={ sectionElt }
			falseComponent={
				<HasSitePurchasesSwitch
					siteId={ siteId }
					trueComponent={ sectionElt }
					falseComponent={ <NoSitesPurchasesMessage /> }
					loadingComponent={ <AdvancedCredentialsLoadingPlaceholder /> }
				/>
			}
			loadingComponent={ <AdvancedCredentialsLoadingPlaceholder /> }
		/>
	);

	next();
};

export const showNotAuthorizedForNonAdmins: PageJS.Callback = ( context, next ) => {
	context.primary = (
		<IsCurrentUserAdminSwitch
			trueComponent={ context.primary }
			falseComponent={ <NotAuthorizedPage /> }
		/>
	);

	next();
};

export const disconnectSite: PageJS.Callback = ( context, next ) => {
	context.primary = (
		<DisconnectSite
			// Ignore type checking because TypeScript is incorrectly inferring the prop type due to the redirectNonJetpack HOC.
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			reason={ context.params.reason }
			type={ context.query.type }
			backHref={ '/dashboard' }
		/>
	);
	next();
};

export const disconnectSiteConfirm: PageJS.Callback = ( context, next ) => {
	const { reason, type, text } = context.query;
	context.primary = (
		<ConfirmDisconnection
			// Ignore type checking because TypeScript is incorrectly inferring the prop type due to the redirectNonJetpack HOC.
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			reason={ reason }
			type={ type }
			text={ text }
			disconnectHref={ '/dashboard' }
			stayConnectedHref={ '/dashboard' }
		/>
	);
	next();
};
