import { addQueryArgs } from '@wordpress/url';
import { localize } from 'i18n-calypso';
import { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { withLocalizedMoment } from 'calypso/components/localized-moment';
import MaterialIcon from 'calypso/components/material-icon';
import VerticalNav from 'calypso/components/vertical-nav';
import VerticalNavItem from 'calypso/components/vertical-nav/item';
import VerticalNavItemEnhanced from 'calypso/components/vertical-nav/item/enhanced';
import {
	getDomainTypeText,
	isSubdomain,
	isDomainUpdateable,
	isDomainInGracePeriod,
} from 'calypso/lib/domains';
import { type as domainTypes, transferStatus, sslStatuses } from 'calypso/lib/domains/constants';
import { isRecentlyRegistered } from 'calypso/lib/domains/utils';
import { hasGSuiteWithUs, getGSuiteMailboxCount } from 'calypso/lib/gsuite';
import { isCancelable } from 'calypso/lib/purchases';
import { getUnmappedUrl } from 'calypso/lib/site/utils';
import { getMaxTitanMailboxCount, hasTitanMailWithUs } from 'calypso/lib/titan';
import { withoutHttp } from 'calypso/lib/url';
import { cancelPurchase } from 'calypso/me/purchases/paths';
import RemovePurchase from 'calypso/me/purchases/remove-purchase';
import {
	domainAddNew,
	domainManagementEdit,
	domainManagementContactsPrivacy,
	domainManagementTransfer,
	domainManagementDns,
	domainManagementDomainConnectMapping,
	domainManagementRedirectSettings,
	domainTransferIn,
	domainManagementSecurity,
	isUnderDomainManagementAll,
} from 'calypso/my-sites/domains/paths';
import { emailManagement } from 'calypso/my-sites/email/paths';
import { recordTracksEvent, recordGoogleEvent } from 'calypso/state/analytics/actions';
import getCurrentRoute from 'calypso/state/selectors/get-current-route';
import isVipSite from 'calypso/state/selectors/is-vip-site';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';

import './style.scss';

class DomainManagementNavigationEnhanced extends Component {
	getEmail() {
		const { selectedSite, translate, currentRoute, domain } = this.props;
		const { emailForwardsCount } = domain;

		if ( ! isDomainUpdateable( domain ) ) {
			return null;
		}

		let navigationDescription;

		let navigationText = translate( 'Manage your email accounts' );

		if ( hasGSuiteWithUs( domain ) ) {
			const gSuiteMailboxCount = getGSuiteMailboxCount( domain );

			navigationDescription = translate(
				'%(gSuiteMailboxCount)d mailbox',
				'%(gSuiteMailboxCount)d mailboxes',
				{
					count: gSuiteMailboxCount,
					args: {
						gSuiteMailboxCount,
					},
					comment: 'The number of GSuite mailboxes active for the current domain',
				}
			);
		} else if ( hasTitanMailWithUs( domain ) ) {
			const titanMailboxCount = getMaxTitanMailboxCount( domain );
			navigationDescription = translate(
				'%(titanMailboxCount)d mailbox',
				'%(titanMailboxCount)d mailboxes',
				{
					args: {
						titanMailboxCount,
					},
					count: titanMailboxCount,
					comment: '%(titanMailboxCount)d is the number of mailboxes for the current domain',
				}
			);
		} else if ( emailForwardsCount > 0 ) {
			navigationDescription = translate(
				'%(emailForwardsCount)d forward',
				'%(emailForwardsCount)d forwards',
				{
					count: emailForwardsCount,
					args: {
						emailForwardsCount,
					},
					comment: 'The number of email forwards active for the current domain',
				}
			);
		} else {
			navigationText = translate( 'Set up your email' );
			navigationDescription = translate( 'Not connected', {
				comment: 'The domain is not using any of the WordPress.com email solutions',
			} );
		}

		return (
			<VerticalNavItemEnhanced
				path={ emailManagement( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="email"
				text={ navigationText }
				description={ navigationDescription }
			/>
		);
	}

	getDestinationText() {
		const { selectedSite, translate, domain } = this.props;

		const wpcomUrl = withoutHttp( getUnmappedUrl( selectedSite ) );
		const { isPrimary, pendingTransfer, pointsToWpcom, registrationDate } = domain;

		const activating = isRecentlyRegistered( registrationDate ) && ! pendingTransfer;

		if ( pointsToWpcom || activating ) {
			return isPrimary
				? translate( 'Destination: primary domain for %(wpcomUrl)s', {
						args: {
							wpcomUrl,
						},
				  } )
				: translate( 'Destination: %(wpcomUrl)s', {
						args: {
							wpcomUrl,
						},
				  } );
		}

		return translate( 'Destination: external service' );
	}

	getNameServers() {
		const { translate, domain, currentRoute, selectedSite } = this.props;

		if ( ! isDomainUpdateable( domain ) && ! isDomainInGracePeriod( domain ) ) {
			return null;
		}

		const description = this.getDestinationText();

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementEdit( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="language"
				text={ translate( 'Change your name servers & DNS records' ) }
				description={ description }
			/>
		);
	}

	getDnsRecords() {
		const { selectedSite, translate, currentRoute, domain } = this.props;

		const description = this.getDestinationText();

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementDns( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="language"
				text={ translate( 'Update your DNS records' ) }
				description={ description }
			/>
		);
	}

	getContactsAndPrivacy() {
		const { selectedSite, translate, currentRoute, domain } = this.props;
		const { privateDomain, privacyAvailable } = domain;

		if ( ! isDomainUpdateable( domain ) && ! isDomainInGracePeriod( domain ) ) {
			return null;
		}

		let description;
		if ( ! privacyAvailable ) {
			description = translate( 'Privacy protection: not available' );
		} else if ( privateDomain ) {
			description = translate( 'Privacy protection: on' );
		} else {
			description = translate( 'Privacy protection: off' );
		}

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementContactsPrivacy( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="chrome_reader_mode"
				text={ translate( 'Update your contact information' ) }
				description={ description }
			/>
		);
	}

	getTransferDomain() {
		const { moment, selectedSite, translate, domain, currentRoute } = this.props;
		const { currentUserIsOwner, expired, isLocked, transferAwayEligibleAt } = domain;

		if ( ! currentUserIsOwner || ( expired && ! isDomainInGracePeriod( domain ) ) ) {
			return null;
		}

		let description;

		if ( transferAwayEligibleAt ) {
			description = translate( 'Outbound transfers available after %(startDate)s', {
				args: {
					startDate: moment( transferAwayEligibleAt ).format( 'LL' ),
				},
				comment: '%(startDate)s is a date string, e.g. April 1, 2020',
			} );
		} else if ( isLocked ) {
			description = translate( 'Transfer lock: on' );
		} else {
			description = translate( 'Transfer lock: off' );
		}

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementTransfer( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="sync_alt"
				text={ translate( 'Transfer your domain' ) }
				description={ description }
			/>
		);
	}

	getTransferMappedDomain() {
		const { selectedSite, translate, domain, currentRoute, isVip } = this.props;

		if ( isVip ) {
			return null;
		}

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementTransfer( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="sync_alt"
				text={ translate( 'Transfer mapping' ) }
			/>
		);
	}

	getTransferInMappedDomain() {
		const { selectedSite, domain, translate } = this.props;

		const { isEligibleForInboundTransfer } = domain;

		if ( ! isEligibleForInboundTransfer ) {
			return null;
		}

		return (
			<VerticalNavItemEnhanced
				onClick={ this.handleTransferDomainClick }
				path={ domainTransferIn( selectedSite.slug, domain.name, true ) }
				materialIcon="sync_alt"
				text={ translate( 'Transfer your domain to WordPress.com' ) }
				description={ translate( 'Manage your site and domain all in one place' ) }
			/>
		);
	}

	getDomainConnectMapping() {
		const { selectedSite, domain, translate } = this.props;

		const { supportsDomainConnect, hasWpcomNameservers, pointsToWpcom } = domain;

		if ( ! supportsDomainConnect || hasWpcomNameservers || pointsToWpcom ) {
			return;
		}

		const path = domainManagementDomainConnectMapping( selectedSite.slug, domain.name );

		return (
			<VerticalNavItemEnhanced
				path={ path }
				materialIcon="double_arrow"
				text={ translate( 'Connect your domain' ) }
				description={ translate( 'Point your domain to your site with zero hassle' ) }
			/>
		);
	}

	getManageSite() {
		const { isManagingAllSites, selectedSite, translate } = this.props;

		if ( ! isManagingAllSites ) {
			return null;
		}

		const wpcomUrl = withoutHttp( getUnmappedUrl( selectedSite ) );

		return (
			<VerticalNavItemEnhanced
				path={ `/home/${ selectedSite.slug }` }
				gridicon="my-sites"
				text={ translate( 'Manage your site' ) }
				description={ wpcomUrl }
			/>
		);
	}

	handleChangeSiteAddressClick = () => {
		const { domain } = this.props;
		const domainType = getDomainTypeText( domain );

		this.props.recordGoogleEvent(
			'Domain Management',
			`Clicked "Change Site Address" navigation link on a ${ domainType } in Edit`,
			'Domain Name',
			domain.name
		);

		this.props.recordTracksEvent( 'calypso_domain_management_change_navigation_click', {
			action: 'change_site_address',
			section: domain.type,
		} );
	};

	handleTransferDomainClick = () => {
		const { domain } = this.props;

		this.props.recordTracksEvent( 'calypso_domain_management_mapped_transfer_click', {
			section: domain.type,
			domain: domain.name,
		} );
	};

	handlePickCustomDomainClick = () => {
		const { domain } = this.props;
		const domainType = getDomainTypeText( domain );

		this.props.recordGoogleEvent(
			'Domain Management',
			`Clicked "Pick a custom domain" navigation link on a ${ domainType } in Edit`,
			'Domain Name',
			domain.name
		);

		this.props.recordTracksEvent( 'calypso_domain_management_wpcom_domain_add_domain', {
			action: 'change_site_address',
			section: domain.type,
		} );
	};

	handleDomainSecurityClick = () => {
		const { domain } = this.props;

		this.props.recordTracksEvent( 'calypso_domain_management_security_click', {
			section: domain.type,
		} );
	};

	handleDomainDeleteClick = () => {
		const { domain, purchase } = this.props;

		this.props.recordTracksEvent( 'calypso_domain_management_delete_click', {
			section: domain.type,
			is_cancelable: purchase && isCancelable( purchase ),
		} );
	};

	getPickCustomDomain() {
		const { selectedSite, translate } = this.props;

		return (
			<VerticalNavItemEnhanced
				path={ domainAddNew( selectedSite.slug ) }
				onClick={ this.handlePickCustomDomainClick }
				materialIcon="search"
				text={ translate( 'Pick a custom domain' ) }
				description={ translate( 'Matches available' ) }
			/>
		);
	}

	getSiteAddressChange() {
		const { domain, translate } = this.props;
		const { isWpcomStagingDomain } = domain;

		if ( isWpcomStagingDomain ) {
			return;
		}

		return (
			<VerticalNavItemEnhanced
				onClick={ this.handleChangeSiteAddressClick }
				materialIcon="create"
				text={ translate( 'Change site address' ) }
				description={ domain.name }
			/>
		);
	}

	getSimilarDomains() {
		const { domain, selectedSite, translate } = this.props;

		if ( isSubdomain( domain.name ) ) {
			return null;
		}

		// we don't use the full domain name, to avoid an error about the taken domain
		const searchTerm = domain.name.split( '.' )[ 0 ];

		let path;

		if ( selectedSite && selectedSite.options && selectedSite.options.is_domain_only ) {
			path = addQueryArgs( '/start/domain/domain-only', {
				search: 'yes',
				new: searchTerm,
			} );
		} else {
			path = domainAddNew( selectedSite.slug, searchTerm );
		}

		return (
			<VerticalNavItemEnhanced
				path={ path }
				onClick={ this.handlePickCustomDomainClick }
				materialIcon="search"
				text={ translate( 'Find similar domains' ) }
				description={ translate( 'Matches available' ) }
			/>
		);
	}

	getSecurity() {
		const { selectedSite, domain, currentRoute, translate } = this.props;

		const { pointsToWpcom, sslStatus } = domain;

		if ( ! pointsToWpcom || ! sslStatus ) {
			return null;
		}

		let sslStatusHuman;
		switch ( sslStatus ) {
			case sslStatuses.SSL_PENDING:
				sslStatusHuman = translate( 'provisioning', {
					comment: 'Shows as "HTTPS encryption: provisioning" in the nav menu',
				} );
				break;
			case sslStatuses.SSL_ACTIVE:
				sslStatusHuman = translate( 'active', {
					comment: 'Shows as "HTTPS encryption: active" in the nav menu',
				} );
				break;
			case sslStatuses.SSL_DISABLED:
				sslStatusHuman = translate( 'disabled', {
					comment: 'Shows as "HTTPS encryption: disabled" in the nav menu',
				} );
				break;
		}

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementSecurity( selectedSite.slug, domain.name, currentRoute ) }
				onClick={ this.handleDomainSecurityClick }
				materialIcon="security"
				text={ translate( 'Review your domain security' ) }
				description={ translate( 'HTTPS encryption: %(sslStatusHuman)s', {
					args: { sslStatusHuman },
				} ) }
			/>
		);
	}

	getDeleteDomain() {
		const { domain, isLoadingPurchase, purchase, selectedSite, translate } = this.props;
		const domainType = domain && domain.type;
		const currentUserIsOwner = domain.currentUserIsOwner;

		if ( ! domain.currentUserCanManage ) {
			return null;
		}

		let title;
		let description;

		if ( domainTypes.TRANSFER === domainType ) {
			const status = domain.transferStatus;

			if ( transferStatus.PENDING_OWNER === status || transferStatus.PENDING_REGISTRY === status ) {
				return null;
			}

			if ( status === transferStatus.CANCELLED ) {
				title = translate( 'Remove transfer from your account' );
				if ( ! currentUserIsOwner ) {
					title = translate( 'Remove transfer' );
					description = translate( 'Only the domain owner can remove the transfer' );
				}
			} else {
				title = translate( 'Cancel transfer' );
				if ( ! currentUserIsOwner ) {
					description = translate( 'Only the domain owner can cancel the transfer' );
				}
			}
		} else if ( domainTypes.MAPPED === domainType ) {
			title = translate( 'Delete domain mapping' );
		} else if ( domainTypes.SITE_REDIRECT === domainType ) {
			title = translate( 'Delete site redirect' );
		} else {
			title = translate( 'Delete your domain permanently' );
		}

		if ( isLoadingPurchase ) {
			return <VerticalNavItem isPlaceholder />;
		}

		if ( ! selectedSite || ! purchase ) {
			return null;
		}

		if ( ! currentUserIsOwner ) {
			return (
				<VerticalNavItemEnhanced materialIcon="delete" text={ title } description={ description } />
			);
		}

		if ( isCancelable( purchase ) ) {
			const link = cancelPurchase( selectedSite.slug, purchase.id );

			return (
				<VerticalNavItemEnhanced
					path={ link }
					onClick={ this.handleDomainDeleteClick }
					materialIcon="delete"
					text={ title }
				/>
			);
		}

		return (
			<RemovePurchase
				hasLoadedSites={ true }
				hasLoadedUserPurchasesFromServer={ true }
				site={ selectedSite }
				purchase={ purchase }
				useVerticalNavItem={ true }
				// eslint-disable-next-line wpcalypso/jsx-classname-namespace
				className="navigation-enhanced__delete-domain is-clickable"
				onClickTracks={ this.handleDomainDeleteClick }
			>
				<MaterialIcon icon="delete" />

				<strong>{ title }</strong>
			</RemovePurchase>
		);
	}

	getRedirectSettings() {
		const { domain, selectedSite, currentRoute, translate } = this.props;

		return (
			<VerticalNavItemEnhanced
				path={ domainManagementRedirectSettings( selectedSite.slug, domain.name, currentRoute ) }
				materialIcon="language"
				text={ translate( 'Redirect settings' ) }
				description={ translate( 'Update your site redirect' ) }
			/>
		);
	}

	renderRegisteredDomainNavigation() {
		return (
			<Fragment>
				{ this.getManageSite() }
				{ this.getNameServers() }
				{ this.getEmail() }
				{ this.getContactsAndPrivacy() }
				{ this.getTransferDomain() }
				{ this.getSecurity() }
				{ this.getSimilarDomains() }
				{ this.getDeleteDomain() }
			</Fragment>
		);
	}

	renderSiteRedirectNavigation() {
		return (
			<Fragment>
				{ this.getManageSite() }
				{ this.getRedirectSettings() }
				{ this.getDeleteDomain() }
			</Fragment>
		);
	}

	renderMappedDomainNavigation() {
		return (
			<Fragment>
				{ this.getManageSite() }
				{ this.getDnsRecords() }
				{ this.getEmail() }
				{ this.getDomainConnectMapping() }
				{ this.getTransferMappedDomain() }
				{ this.getTransferInMappedDomain() }
				{ this.getSecurity() }
				{ this.getSimilarDomains() }
				{ this.getDeleteDomain() }
			</Fragment>
		);
	}

	renderTransferInDomainNavigation() {
		return (
			<Fragment>
				{ this.getManageSite() }
				{ this.getDnsRecords() }
				{ this.getSecurity() }
				{ this.getDeleteDomain() }
			</Fragment>
		);
	}

	renderWpcomDomainNavigation() {
		return (
			<Fragment>
				{ this.getManageSite() }
				{ this.getSiteAddressChange() }
				{ this.getPickCustomDomain() }
			</Fragment>
		);
	}

	render() {
		const { domain } = this.props;
		const domainType = domain && domain.type;

		return (
			<VerticalNav>
				{ domainType === domainTypes.WPCOM && this.renderWpcomDomainNavigation() }
				{ domainType === domainTypes.MAPPED && this.renderMappedDomainNavigation() }
				{ domainType === domainTypes.REGISTERED && this.renderRegisteredDomainNavigation() }
				{ domainType === domainTypes.SITE_REDIRECT && this.renderSiteRedirectNavigation() }
				{ domainType === domainTypes.TRANSFER && this.renderTransferInDomainNavigation() }
			</VerticalNav>
		);
	}
}

export default connect(
	( state ) => {
		const currentRoute = getCurrentRoute( state );
		const siteId = getSelectedSiteId( state );
		return {
			currentRoute,
			isManagingAllSites: isUnderDomainManagementAll( currentRoute ),
			isVip: isVipSite( state, siteId ),
		};
	},
	{ recordTracksEvent, recordGoogleEvent }
)( localize( withLocalizedMoment( DomainManagementNavigationEnhanced ) ) );
