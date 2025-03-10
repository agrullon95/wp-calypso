import config from '@automattic/calypso-config';
import { useTranslate } from 'i18n-calypso';
import page from 'page';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import titleCase from 'to-title-case';
import DocumentHead from 'calypso/components/data/document-head';
import QuerySitePurchases from 'calypso/components/data/query-site-purchases';
import HeaderCake from 'calypso/components/header-cake';
import VerticalNav from 'calypso/components/vertical-nav';
import VerticalNavItem from 'calypso/components/vertical-nav/item';
import { useGetEmailAccountsQuery } from 'calypso/data/emails/use-get-email-accounts-query';
import {
	getGoogleAdminUrl,
	getGoogleMailServiceFamily,
	getGSuiteProductSlug,
	getGSuiteSubscriptionStatus,
	getProductType,
	hasGSuiteWithUs,
} from 'calypso/lib/gsuite';
import { handleRenewNowClick, isExpired } from 'calypso/lib/purchases';
import {
	getTitanProductName,
	getTitanProductSlug,
	getTitanSubscriptionId,
	hasTitanMailWithUs,
} from 'calypso/lib/titan';
import { TITAN_CONTROL_PANEL_CONTEXT_CREATE_EMAIL } from 'calypso/lib/titan/constants';
import EmailPlanHeader from 'calypso/my-sites/email/email-management/home/email-plan-header';
import EmailPlanMailboxesList from 'calypso/my-sites/email/email-management/home/email-plan-mailboxes-list';
import {
	getEmailPurchaseByDomain,
	hasEmailSubscription,
} from 'calypso/my-sites/email/email-management/home/utils';
import {
	emailManagement,
	emailManagementAddEmailForwards,
	emailManagementAddGSuiteUsers,
	emailManagementManageTitanAccount,
	emailManagementManageTitanMailboxes,
	emailManagementNewTitanAccount,
	emailManagementPurchaseNewEmailAccount,
	emailManagementTitanControlPanelRedirect,
} from 'calypso/my-sites/email/paths';
import { getManagePurchaseUrlFor } from 'calypso/my-sites/purchases/paths';
import {
	hasLoadedSitePurchasesFromServer,
	isFetchingSitePurchases,
} from 'calypso/state/purchases/selectors';
import getCurrentRoute from 'calypso/state/selectors/get-current-route';

const UpgradeNavItem = ( { currentRoute, domain, selectedSiteSlug } ) => {
	const translate = useTranslate();

	if ( hasGSuiteWithUs( domain ) || hasTitanMailWithUs( domain ) ) {
		return null;
	}

	return (
		<VerticalNavItem
			path={ emailManagementPurchaseNewEmailAccount( selectedSiteSlug, domain.name, currentRoute ) }
		>
			{ translate( 'Upgrade to a hosted email' ) }
		</VerticalNavItem>
	);
};

UpgradeNavItem.propTypes = {
	currentRoute: PropTypes.string,
	domain: PropTypes.object.isRequired,
	selectedSiteSlug: PropTypes.string.isRequired,
};

function getAccount( data ) {
	return data?.accounts?.[ 0 ];
}

function getMailboxes( data ) {
	const account = getAccount( data );

	return account?.emails ?? [];
}

function EmailPlan( { domain, selectedSite, source } ) {
	const translate = useTranslate();

	const purchase = useSelector( ( state ) => getEmailPurchaseByDomain( state, domain ) );
	const isLoadingPurchase = useSelector(
		( state ) => isFetchingSitePurchases( state ) || ! hasLoadedSitePurchasesFromServer( state )
	);
	const currentRoute = useSelector( getCurrentRoute );

	const canAddMailboxes =
		( getGSuiteProductSlug( domain ) || getTitanProductSlug( domain ) ) &&
		getGSuiteSubscriptionStatus( domain ) !== 'suspended';
	const hasSubscription = hasEmailSubscription( domain );

	const handleBack = () => {
		page( emailManagement( selectedSite.slug ) );
	};

	const handleRenew = ( event ) => {
		event.preventDefault();

		handleRenewNowClick( purchase, selectedSite.slug, {
			tracksProps: { source: 'email-plan-view' },
		} );
	};

	function getAddMailboxProps() {
		if ( hasGSuiteWithUs( domain ) ) {
			return {
				path: emailManagementAddGSuiteUsers(
					selectedSite.slug,
					domain.name,
					getProductType( getGSuiteProductSlug( domain ) ),
					currentRoute,
					source
				),
			};
		}

		if ( hasTitanMailWithUs( domain ) ) {
			if ( getTitanSubscriptionId( domain ) ) {
				return {
					path: emailManagementNewTitanAccount(
						selectedSite.slug,
						domain.name,
						currentRoute,
						source
					),
				};
			}

			const showExternalControlPanelLink = ! config.isEnabled( 'titan/iframe-control-panel' );
			const controlPanelUrl = showExternalControlPanelLink
				? emailManagementTitanControlPanelRedirect( selectedSite.slug, domain.name, currentRoute, {
						context: TITAN_CONTROL_PANEL_CONTEXT_CREATE_EMAIL,
				  } )
				: emailManagementManageTitanAccount( selectedSite.slug, domain.name, currentRoute, {
						context: TITAN_CONTROL_PANEL_CONTEXT_CREATE_EMAIL,
				  } );

			return {
				external: showExternalControlPanelLink,
				path: controlPanelUrl,
			};
		}

		return {
			path: emailManagementAddEmailForwards( selectedSite.slug, domain.name, currentRoute ),
		};
	}

	function getHeaderText() {
		if ( hasGSuiteWithUs( domain ) ) {
			const googleMailService = getGoogleMailServiceFamily( getGSuiteProductSlug( domain ) );

			return translate( '%(googleMailService)s settings', {
				args: {
					googleMailService,
				},
				comment: '%(googleMailService)s can be either "GSuite" or "Google Workspace"',
			} );
		}

		if ( hasTitanMailWithUs( domain ) ) {
			return translate( '%(titanProductName)s settings', {
				args: {
					titanProductName: getTitanProductName(),
				},
				comment:
					'%(titanProductName) is the name of the product, which should be "Professional Email" translated',
			} );
		}

		return translate( 'Email forwarding settings' );
	}

	function renderViewBillingAndPaymentSettingsNavItem() {
		if ( ! hasSubscription ) {
			return null;
		}

		if ( ! purchase ) {
			return <VerticalNavItem isPlaceholder />;
		}

		const managePurchaseUrl = getManagePurchaseUrlFor( selectedSite.slug, purchase.id );

		return (
			<VerticalNavItem path={ managePurchaseUrl }>
				{ translate( 'View billing and payment settings' ) }
			</VerticalNavItem>
		);
	}

	function getManageAllNavItemProps() {
		if ( hasGSuiteWithUs( domain ) ) {
			return {
				external: true,
				path: getGoogleAdminUrl( domain.name ),
			};
		}

		if ( hasTitanMailWithUs( domain ) ) {
			if ( config.isEnabled( 'titan/iframe-control-panel' ) ) {
				return {
					path: emailManagementManageTitanAccount( selectedSite.slug, domain.name, currentRoute ),
				};
			}

			return {
				path: emailManagementManageTitanMailboxes( selectedSite.slug, domain.name, currentRoute ),
			};
		}

		return null;
	}

	function renderManageAllMailboxesNavItem() {
		const manageAllNavItemProps = getManageAllNavItemProps();

		if ( manageAllNavItemProps === null ) {
			return null;
		}

		return (
			<VerticalNavItem { ...manageAllNavItemProps }>
				{ translate( 'Manage all mailboxes', {
					comment:
						'This is the text for a link to manage all email accounts/mailboxes for a subscription',
				} ) }
			</VerticalNavItem>
		);
	}

	function renderAddNewMailboxesOrRenewNavItem() {
		if ( hasTitanMailWithUs( domain ) && ! hasSubscription ) {
			return (
				<VerticalNavItem { ...getAddMailboxProps() }>
					{ translate( 'Add new mailboxes' ) }
				</VerticalNavItem>
			);
		}

		if ( hasTitanMailWithUs( domain ) || hasGSuiteWithUs( domain ) ) {
			if ( ! purchase ) {
				return <VerticalNavItem isPlaceholder />;
			}

			if ( isExpired( purchase ) ) {
				return (
					<VerticalNavItem onClick={ handleRenew } path="#">
						{ translate( 'Renew to add new mailboxes' ) }
					</VerticalNavItem>
				);
			}

			return (
				<VerticalNavItem { ...getAddMailboxProps() } disabled={ ! canAddMailboxes }>
					{ translate( 'Add new mailboxes' ) }
				</VerticalNavItem>
			);
		}

		return (
			<VerticalNavItem { ...getAddMailboxProps() }>
				{ translate( 'Add new email forwards' ) }
			</VerticalNavItem>
		);
	}

	const { data, isLoading } = useGetEmailAccountsQuery( selectedSite.ID, domain.name, {
		retry: false,
	} );

	return (
		<>
			{ selectedSite && hasSubscription && <QuerySitePurchases siteId={ selectedSite.ID } /> }
			<DocumentHead title={ titleCase( getHeaderText() ) } />
			<HeaderCake onClick={ handleBack }>{ getHeaderText() }</HeaderCake>
			<EmailPlanHeader
				domain={ domain }
				hasEmailSubscription={ hasSubscription }
				isLoadingEmails={ isLoading }
				isLoadingPurchase={ isLoadingPurchase }
				purchase={ purchase }
				selectedSite={ selectedSite }
				emailAccount={ data?.accounts?.[ 0 ] || {} }
			/>
			<EmailPlanMailboxesList
				account={ getAccount( data ) }
				domain={ domain }
				mailboxes={ getMailboxes( data ) }
				isLoadingEmails={ isLoading }
			/>
			<div className="email-plan__actions">
				<VerticalNav>
					{ renderAddNewMailboxesOrRenewNavItem() }
					<UpgradeNavItem
						currentRoute={ currentRoute }
						domain={ domain }
						selectedSiteSlug={ selectedSite.slug }
					/>
					{ renderManageAllMailboxesNavItem() }
					{ renderViewBillingAndPaymentSettingsNavItem() }
				</VerticalNav>
			</div>
		</>
	);
}

EmailPlan.propTypes = {
	domain: PropTypes.object.isRequired,
	selectedSite: PropTypes.object.isRequired,
	source: PropTypes.string,
};

export default EmailPlan;
