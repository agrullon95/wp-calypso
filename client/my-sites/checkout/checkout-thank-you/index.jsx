import {
	isBlogger,
	isBusiness,
	isChargeback,
	isCredits,
	isDelayedDomainTransfer,
	isDIFMProduct,
	isDomainMapping,
	isDomainProduct,
	isDomainRedemption,
	isDomainRegistration,
	isDomainTransfer,
	isEcommerce,
	isGSuiteOrExtraLicenseOrGoogleWorkspace,
	isGSuiteOrGoogleWorkspace,
	isJetpackBusinessPlan,
	isJetpackPlan,
	isPersonal,
	isPlan,
	isPremium,
	isPro,
	isSiteRedirect,
	isStarter,
	isTheme,
	isTitanMail,
	shouldFetchSitePlans,
} from '@automattic/calypso-products';
import { Card } from '@automattic/components';
import { localize } from 'i18n-calypso';
import { find, get } from 'lodash';
import page from 'page';
import PropTypes from 'prop-types';
import { Component } from 'react';
import { connect } from 'react-redux';
import PlanThankYouCard from 'calypso/blocks/plan-thank-you-card';
import HappinessSupport from 'calypso/components/happiness-support';
import Main from 'calypso/components/main';
import Notice from 'calypso/components/notice';
import PurchaseDetail from 'calypso/components/purchase-detail';
import WordPressLogo from 'calypso/components/wordpress-logo';
import WpAdminAutoLogin from 'calypso/components/wpadmin-auto-login';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import { getFeatureByKey } from 'calypso/lib/plans/features-list';
import { isExternal } from 'calypso/lib/url';
import DIFMLiteThankYou from 'calypso/my-sites/checkout/checkout-thank-you/difm/difm-lite-thank-you';
import {
	domainManagementList,
	domainManagementTransferInPrecheck,
} from 'calypso/my-sites/domains/paths';
import { emailManagement } from 'calypso/my-sites/email/paths';
import TitanSetUpThankYou from 'calypso/my-sites/email/titan-set-up-thank-you';
import { isStarterPlanEnabled } from 'calypso/my-sites/plans-comparison';
import { fetchAtomicTransfer } from 'calypso/state/atomic-transfer/actions';
import { transferStates } from 'calypso/state/atomic-transfer/constants';
import {
	getCurrentUser,
	getCurrentUserDate,
	isCurrentUserEmailVerified,
} from 'calypso/state/current-user/selectors';
import { recordStartTransferClickInThankYou } from 'calypso/state/domains/actions';
import isHappychatUserEligible from 'calypso/state/happychat/selectors/is-happychat-user-eligible';
import { isProductsListFetching } from 'calypso/state/products-list/selectors';
import { fetchReceipt } from 'calypso/state/receipts/actions';
import { getReceiptById } from 'calypso/state/receipts/selectors';
import getAtomicTransfer from 'calypso/state/selectors/get-atomic-transfer';
import getCheckoutUpgradeIntent from 'calypso/state/selectors/get-checkout-upgrade-intent';
import getCustomizeOrEditFrontPageUrl from 'calypso/state/selectors/get-customize-or-edit-front-page-url';
import { fetchSitePlans, refreshSitePlans } from 'calypso/state/sites/plans/actions';
import { getPlansBySite } from 'calypso/state/sites/plans/selectors';
import { getSiteHomeUrl, getSiteSlug, getSite } from 'calypso/state/sites/selectors';
import { requestThenActivate } from 'calypso/state/themes/actions';
import { getActiveTheme } from 'calypso/state/themes/selectors';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import AtomicStoreThankYouCard from './atomic-store-thank-you-card';
import BloggerPlanDetails from './blogger-plan-details';
import BusinessPlanDetails from './business-plan-details';
import ChargebackDetails from './chargeback-details';
import DomainMappingDetails from './domain-mapping-details';
import DomainRegistrationDetails from './domain-registration-details';
import DomainThankYou from './domains/domain-thank-you';
import EcommercePlanDetails from './ecommerce-plan-details';
import FailedPurchaseDetails from './failed-purchase-details';
import CheckoutThankYouFeaturesHeader from './features-header';
import GoogleAppsDetails from './google-apps-details';
import CheckoutThankYouHeader from './header';
import JetpackPlanDetails from './jetpack-plan-details';
import PersonalPlanDetails from './personal-plan-details';
import PremiumPlanDetails from './premium-plan-details';
import ProPlanDetails from './pro-plan-details';
import SiteRedirectDetails from './site-redirect-details';
import StarterPlanDetails from './starter-plan-details';
import TransferPending from './transfer-pending';
import './style.scss';

function getPurchases( props ) {
	return [
		...get( props, 'receipt.data.purchases', [] ),
		...get( props, 'gsuiteReceipt.data.purchases', [] ),
	];
}

function getFailedPurchases( props ) {
	return ( props.receipt.data && props.receipt.data.failedPurchases ) || [];
}

function findPurchaseAndDomain( purchases, predicate ) {
	const purchase = find( purchases, predicate );

	return [ purchase, purchase.meta ];
}

export class CheckoutThankYou extends Component {
	static propTypes = {
		domainOnlySiteFlow: PropTypes.bool.isRequired,
		failedPurchases: PropTypes.array,
		isSimplified: PropTypes.bool,
		receiptId: PropTypes.number,
		gsuiteReceiptId: PropTypes.number,
		selectedFeature: PropTypes.string,
		upgradeIntent: PropTypes.string,
		selectedSite: PropTypes.oneOfType( [ PropTypes.bool, PropTypes.object ] ),
		siteHomeUrl: PropTypes.string.isRequired,
		transferComplete: PropTypes.bool,
		siteUnlaunchedBeforeUpgrade: PropTypes.bool,
	};

	constructor( props ) {
		super( props );
		this.state = {
			didThemeRedirect: false,
		};
	}

	componentDidMount() {
		this.redirectIfThemePurchased();

		const { gsuiteReceipt, gsuiteReceiptId, receipt, receiptId, selectedSite, sitePlans } =
			this.props;

		if ( selectedSite ) {
			this.props.fetchAtomicTransfer?.( selectedSite.ID );
		}

		if ( selectedSite && receipt.hasLoadedFromServer && this.hasPlanOrDomainProduct() ) {
			this.props.refreshSitePlans( selectedSite.ID );
		} else if ( selectedSite && shouldFetchSitePlans( sitePlans ) ) {
			this.props.fetchSitePlans( selectedSite.ID );
		}

		if ( receiptId && ! receipt.hasLoadedFromServer && ! receipt.isRequesting ) {
			this.props.fetchReceipt( receiptId );
		}

		if (
			gsuiteReceiptId &&
			gsuiteReceipt &&
			! gsuiteReceipt.hasLoadedFromServer &&
			! gsuiteReceipt.isRequesting
		) {
			this.props.fetchReceipt( gsuiteReceiptId );
		}

		recordTracksEvent( 'calypso_checkout_thank_you_view' );

		window.scrollTo( 0, 0 );
	}

	componentDidUpdate( prevProps ) {
		const { receiptId, selectedSiteSlug, domainOnlySiteFlow } = this.props;

		this.redirectIfThemePurchased();

		if (
			! prevProps.receipt.hasLoadedFromServer &&
			this.props.receipt.hasLoadedFromServer &&
			this.hasPlanOrDomainProduct() &&
			this.props.selectedSite
		) {
			this.props.refreshSitePlans( this.props.selectedSite.ID );
		}

		// Update route when an ecommerce site goes Atomic and site slug changes
		// from 'wordpress.com` to `wpcomstaging.com`.
		if (
			selectedSiteSlug &&
			selectedSiteSlug !== prevProps.selectedSiteSlug &&
			! domainOnlySiteFlow
		) {
			const receiptPath = receiptId ? `/${ receiptId }` : '';
			page( `/checkout/thank-you/${ selectedSiteSlug }${ receiptPath }` );
		}
	}

	hasPlanOrDomainProduct = () => {
		return getPurchases( this.props ).some(
			( purchase ) => isPlan( purchase ) || isDomainProduct( purchase )
		);
	};

	renderConfirmationNotice = () => {
		if ( ! this.props.user || ! this.props.user.email || this.props.user.email_verified ) {
			return null;
		}

		return (
			<Notice
				className="checkout-thank-you__verification-notice"
				showDismiss={ false }
				status="is-warning"
			>
				{ this.props.translate(
					'We’ve sent a message to {{strong}}%(email)s{{/strong}}. ' +
						'Please check your email to confirm your address.',
					{
						args: { email: this.props.user.email },
						components: {
							strong: <strong className="checkout-thank-you__verification-notice-email" />,
						},
					}
				) }
			</Notice>
		);
	};

	renderVerifiedEmailRequired = ( props = this.props ) => {
		const { isEmailVerified } = props;

		if ( isEmailVerified ) {
			return null;
		}

		return (
			<Notice
				className="checkout-thank-you__verified-required"
				showDismiss={ false }
				status="is-error"
			>
				{ this.props.translate(
					'You’re almost there! Take one moment to check your email and ' +
						'verify your address to complete set up of your eCommerce store'
				) }
			</Notice>
		);
	};

	isDataLoaded = () => {
		if ( this.isGenericReceipt() ) {
			return true;
		}

		return (
			( ! this.props.selectedSite || this.props.sitePlans.hasLoadedFromServer ) &&
			this.props.receipt.hasLoadedFromServer &&
			( ! this.props.gsuiteReceipt || this.props.gsuiteReceipt.hasLoadedFromServer ) &&
			! this.props.isProductsListFetching
		);
	};

	isGenericReceipt = () => {
		return ! this.props.receiptId;
	};

	redirectIfThemePurchased = () => {
		// Only do theme redirect once
		const { didThemeRedirect } = this.state;
		if ( didThemeRedirect ) {
			return;
		}

		const purchases = getPurchases( this.props );

		if (
			this.props.receipt.hasLoadedFromServer &&
			purchases.length > 0 &&
			purchases.every( isTheme )
		) {
			const themeId = purchases[ 0 ].meta;
			// Mark that we've done the redirect, and do the actual redirect once the state is recorded
			this.setState( { didThemeRedirect: true }, () => {
				this.props.requestThenActivate( themeId, this.props.selectedSite.ID, 'calypstore', true );
				page.redirect( '/themes/' + this.props.selectedSite.slug );
			} );
		}
	};

	primaryCta = () => {
		const { selectedSite, upgradeIntent, redirectTo } = this.props;

		if ( this.isDataLoaded() && ! this.isGenericReceipt() ) {
			const purchases = getPurchases( this.props );
			const siteSlug = selectedSite?.slug;

			if ( ! siteSlug && getFailedPurchases( this.props ).length > 0 ) {
				return page( '/start/domain-first' );
			}

			if ( ! isExternal( redirectTo ) ) {
				return page( redirectTo );
			}

			switch ( upgradeIntent ) {
				case 'plugins':
				case 'themes':
					return page( `/${ upgradeIntent }/${ siteSlug }` );
			}

			if ( purchases.some( isPlan ) ) {
				return page( `/plans/my-plan/${ siteSlug }` );
			}

			if (
				purchases.some( isDomainProduct ) ||
				purchases.some( isDomainTransfer ) ||
				purchases.some( isDomainRedemption ) ||
				purchases.some( isSiteRedirect )
			) {
				return page( domainManagementList( siteSlug ) );
			}

			if ( purchases.some( isGSuiteOrExtraLicenseOrGoogleWorkspace ) ) {
				const purchase = find( purchases, isGSuiteOrExtraLicenseOrGoogleWorkspace );

				return page( emailManagement( siteSlug, purchase.meta ) );
			}
		}

		return page( this.props.siteHomeUrl );
	};

	getAnalyticsProperties = () => {
		const { gsuiteReceiptId, receiptId, selectedFeature: feature, selectedSite } = this.props;
		const site = get( selectedSite, 'slug' );

		if ( gsuiteReceiptId ) {
			return {
				path: '/checkout/thank-you/:site/:receipt_id/with-gsuite/:gsuite_receipt_id',
				properties: { gsuite_receipt_id: gsuiteReceiptId, receipt_id: receiptId, site },
			};
		}
		if ( feature && receiptId ) {
			return {
				path: '/checkout/thank-you/features/:feature/:site/:receipt_id',
				properties: { feature, receipt_id: receiptId, site },
			};
		}
		if ( feature && ! receiptId ) {
			return {
				path: '/checkout/thank-you/features/:feature/:site',
				properties: { feature, site },
			};
		}
		if ( receiptId && selectedSite ) {
			return {
				path: '/checkout/thank-you/:site/:receipt_id',
				properties: { receipt_id: receiptId, site },
			};
		}
		if ( receiptId && ! selectedSite ) {
			return {
				path: '/checkout/thank-you/no-site/:receipt_id',
				properties: { receipt_id: receiptId },
			};
		}
		if ( selectedSite ) {
			return {
				path: '/checkout/thank-you/:site',
				properties: { site },
			};
		}
		return { path: '/checkout/thank-you/no-site', properties: {} };
	};

	render() {
		const { translate, isHappychatEligible } = this.props;
		let purchases = [];
		let failedPurchases = [];
		let wasJetpackPlanPurchased = false;
		let wasEcommercePlanPurchased = false;
		let showHappinessSupport = ! this.props.isSimplified;
		let wasDIFMProduct = false;
		let delayedTransferPurchase = false;
		let wasDomainProduct = false;
		let wasGSuiteOrGoogleWorkspace = false;
		let wasTitanEmailOnlyProduct = false;
		let wasTitanEmailProduct = false;

		if ( this.isDataLoaded() && ! this.isGenericReceipt() ) {
			purchases = getPurchases( this.props ).filter( ( purchase ) => ! isCredits( purchase ) );

			wasGSuiteOrGoogleWorkspace = purchases.some( isGSuiteOrGoogleWorkspace );
			wasTitanEmailProduct = purchases.some( isTitanMail );
			failedPurchases = getFailedPurchases( this.props );
			wasJetpackPlanPurchased = purchases.some( isJetpackPlan );
			wasEcommercePlanPurchased = purchases.some( isEcommerce );
			showHappinessSupport = showHappinessSupport && ! purchases.some( isStarter ); // Don't show support if Starter was purchased
			delayedTransferPurchase = find( purchases, isDelayedDomainTransfer );
			wasDomainProduct = purchases.some(
				( purchase ) =>
					isDomainMapping( purchase ) ||
					isDomainTransfer( purchase ) ||
					isDomainRegistration( purchase )
			);
			wasDIFMProduct = purchases.some( isDIFMProduct );
			wasTitanEmailOnlyProduct = purchases.length === 1 && purchases.some( isTitanMail );
		} else if ( isStarterPlanEnabled() ) {
			// Don't show the Happiness support until we figure out the user doesn't have a starter plan
			showHappinessSupport = false;
		}

		// this placeholder is using just wp logo here because two possible states do not share a common layout
		if (
			! purchases.length &&
			! failedPurchases.length &&
			! this.isGenericReceipt() &&
			! this.props.selectedSite
		) {
			// disabled because we use global loader icon
			/* eslint-disable wpcalypso/jsx-classname-namespace */
			return <WordPressLogo className="wpcom-site__logo" />;
			/* eslint-enable wpcalypso/jsx-classname-namespace */
		}

		if ( wasDIFMProduct ) {
			return (
				<Main className="checkout-thank-you">
					<DIFMLiteThankYou />
				</Main>
			);
		}

		if ( wasEcommercePlanPurchased ) {
			if ( ! this.props.transferComplete ) {
				return (
					<TransferPending orderId={ this.props.receiptId } siteId={ this.props.selectedSite.ID } />
				);
			}

			return (
				<Main className="checkout-thank-you">
					{ this.props.transferComplete && this.props.isEmailVerified && (
						<WpAdminAutoLogin
							site={ { URL: `https://${ this.props.site?.wpcom_url }` } }
							delay={ 0 }
						/>
					) }
					<PageViewTracker { ...this.getAnalyticsProperties() } title="Checkout Thank You" />
					<AtomicStoreThankYouCard siteId={ this.props.selectedSite.ID } />
				</Main>
			);
		} else if ( delayedTransferPurchase ) {
			const planProps = {
				action: (
					// eslint-disable-next-line
					<a className="thank-you-card__button" onClick={ this.startTransfer }>
						{ translate( 'Start Domain Transfer' ) }
					</a>
				),
				description: translate( "Now let's get your domain transferred." ),
			};

			// domain transfer page
			return (
				<Main className="checkout-thank-you">
					<PageViewTracker { ...this.getAnalyticsProperties() } title="Checkout Thank You" />
					{ this.renderConfirmationNotice() }
					<PlanThankYouCard siteId={ this.props.selectedSite.ID } { ...planProps } />
				</Main>
			);
		} else if ( wasDomainProduct ) {
			const [ purchaseType, predicate ] = this.getDomainPurchaseType( purchases );
			const [ , domainName ] = findPurchaseAndDomain( purchases, predicate );

			const professionalEmailPurchase = this.getProfessionalEmailPurchaseFromPurchases(
				predicate,
				purchases
			);

			return (
				<DomainThankYou
					domain={ domainName }
					email={
						professionalEmailPurchase ? professionalEmailPurchase.meta : this.props.user?.email
					}
					hasProfessionalEmail={ wasTitanEmailProduct }
					hideProfessionalEmailStep={ wasGSuiteOrGoogleWorkspace }
					selectedSiteSlug={ this.props.selectedSiteSlug }
					type={ purchaseType }
				/>
			);
		} else if ( wasTitanEmailOnlyProduct ) {
			return (
				<TitanSetUpThankYou
					domainName={ purchases[ 0 ].meta }
					subtitle={ translate( 'You will receive an email confirmation shortly.' ) }
					title={ translate( 'Congratulations on your purchase!' ) }
				/>
			);
		}

		if ( this.props.domainOnlySiteFlow && purchases.length > 0 && ! failedPurchases.length ) {
			return null;
		}

		// standard thanks page
		return (
			<Main className="checkout-thank-you">
				<PageViewTracker { ...this.getAnalyticsProperties() } title="Checkout Thank You" />

				<Card className="checkout-thank-you__content">{ this.productRelatedMessages() }</Card>
				{ showHappinessSupport && (
					<Card className="checkout-thank-you__footer">
						<HappinessSupport
							isJetpack={ wasJetpackPlanPurchased }
							liveChatButtonEventName="calypso_plans_autoconfig_chat_initiated"
							showLiveChatButton={ isHappychatEligible }
						/>
					</Card>
				) }
			</Main>
		);
	}

	getProfessionalEmailPurchaseFromPurchases( purchaseTypePredicate, purchases ) {
		const titanMailPurchases = purchases.filter(
			( product ) => isTitanMail( product ) && purchaseTypePredicate( product )
		);
		if ( titanMailPurchases.length > 0 ) {
			return titanMailPurchases[ 0 ];
		}

		return null;
	}

	getDomainPurchaseType( purchases ) {
		const hasDomainMapping = purchases.some( isDomainMapping );

		if ( hasDomainMapping && purchases.some( isDomainRegistration ) ) {
			return [ 'REGISTRATION', isDomainRegistration ];
		} else if ( hasDomainMapping ) {
			return [ 'MAPPING', isDomainMapping ];
		}
		return [ 'TRANSFER', isDomainTransfer ];
	}

	startTransfer = ( event ) => {
		event.preventDefault();

		const { selectedSite } = this.props;
		const purchases = getPurchases( this.props );
		const delayedTransferPurchase = find( purchases, isDelayedDomainTransfer );

		this.props.recordStartTransferClickInThankYou( delayedTransferPurchase.meta );

		page( domainManagementTransferInPrecheck( selectedSite.slug, delayedTransferPurchase.meta ) );
	};

	/**
	 * Retrieves the component (and any corresponding data) that should be displayed according to the type of purchase
	 * just performed by the user.
	 *
	 * @returns {*[]} an array of varying size with the component instance,
	 * then an optional purchase object possibly followed by a domain name
	 */
	getComponentAndPrimaryPurchaseAndDomain = () => {
		if ( this.isDataLoaded() && ! this.isGenericReceipt() ) {
			const purchases = getPurchases( this.props );
			const failedPurchases = getFailedPurchases( this.props );
			if ( failedPurchases.length > 0 ) {
				return [ FailedPurchaseDetails ];
			} else if ( purchases.some( isJetpackPlan ) ) {
				return [ JetpackPlanDetails, find( purchases, isJetpackPlan ) ];
			} else if ( purchases.some( isBlogger ) ) {
				return [ BloggerPlanDetails, find( purchases, isBlogger ) ];
			} else if ( purchases.some( isPersonal ) ) {
				return [ PersonalPlanDetails, find( purchases, isPersonal ) ];
			} else if ( purchases.some( isStarter ) ) {
				return [ StarterPlanDetails, find( purchases, isStarter ) ];
			} else if ( purchases.some( isPremium ) ) {
				return [ PremiumPlanDetails, find( purchases, isPremium ) ];
			} else if ( purchases.some( isBusiness ) ) {
				return [ BusinessPlanDetails, find( purchases, isBusiness ) ];
			} else if ( purchases.some( isPro ) ) {
				return [ ProPlanDetails, find( purchases, isPro ) ];
			} else if ( purchases.some( isEcommerce ) ) {
				return [ EcommercePlanDetails, find( purchases, isEcommerce ) ];
			} else if ( purchases.some( isDomainRegistration ) ) {
				return [
					DomainRegistrationDetails,
					...findPurchaseAndDomain( purchases, isDomainRegistration ),
				];
			} else if ( purchases.some( isGSuiteOrExtraLicenseOrGoogleWorkspace ) ) {
				return [
					GoogleAppsDetails,
					...findPurchaseAndDomain( purchases, isGSuiteOrExtraLicenseOrGoogleWorkspace ),
				];
			} else if ( purchases.some( isDomainMapping ) ) {
				return [ DomainMappingDetails, ...findPurchaseAndDomain( purchases, isDomainMapping ) ];
			} else if ( purchases.some( isSiteRedirect ) ) {
				return [ SiteRedirectDetails, ...findPurchaseAndDomain( purchases, isSiteRedirect ) ];
			} else if ( purchases.some( isDomainTransfer ) ) {
				return [ false, ...findPurchaseAndDomain( purchases, isDomainTransfer ) ];
			} else if ( purchases.some( isTitanMail ) ) {
				return [ false, ...findPurchaseAndDomain( purchases, isTitanMail ) ];
			} else if ( purchases.some( isChargeback ) ) {
				return [ ChargebackDetails, find( purchases, isChargeback ) ];
			}
		}

		return [];
	};

	productRelatedMessages = () => {
		const {
			selectedSite,
			siteUnlaunchedBeforeUpgrade,
			upgradeIntent,
			isSimplified,
			sitePlans,
			displayMode,
			customizeUrl,
		} = this.props;
		const purchases = getPurchases( this.props );
		const failedPurchases = getFailedPurchases( this.props );
		const hasFailedPurchases = failedPurchases.length > 0;
		const [ ComponentClass, primaryPurchase, domain ] =
			this.getComponentAndPrimaryPurchaseAndDomain();
		const registrarSupportUrl =
			! ComponentClass || this.isGenericReceipt() || hasFailedPurchases
				? null
				: get( primaryPurchase, 'registrarSupportUrl', null );
		const isRootDomainWithUs = get( primaryPurchase, 'isRootDomainWithUs', false );

		if ( ! this.isDataLoaded() ) {
			return (
				<div>
					<CheckoutThankYouHeader
						isDataLoaded={ false }
						isSimplified={ isSimplified }
						selectedSite={ selectedSite }
						upgradeIntent={ upgradeIntent }
						siteUnlaunchedBeforeUpgrade={ siteUnlaunchedBeforeUpgrade }
						displayMode={ displayMode }
					/>

					{ ! isSimplified && (
						<>
							<CheckoutThankYouFeaturesHeader isDataLoaded={ false } />

							<div className="checkout-thank-you__purchase-details-list">
								<PurchaseDetail isPlaceholder />
								<PurchaseDetail isPlaceholder />
								<PurchaseDetail isPlaceholder />
							</div>
						</>
					) }
				</div>
			);
		}

		return (
			<div>
				<CheckoutThankYouHeader
					isDataLoaded={ this.isDataLoaded() }
					isSimplified={ isSimplified }
					primaryPurchase={ primaryPurchase }
					selectedSite={ selectedSite }
					hasFailedPurchases={ hasFailedPurchases }
					siteUnlaunchedBeforeUpgrade={ siteUnlaunchedBeforeUpgrade }
					upgradeIntent={ upgradeIntent }
					primaryCta={ this.primaryCta }
					displayMode={ displayMode }
					purchases={ purchases }
				>
					{ ! isSimplified && primaryPurchase && (
						<CheckoutThankYouFeaturesHeader
							isDataLoaded={ this.isDataLoaded() }
							isGenericReceipt={ this.isGenericReceipt() }
							purchases={ purchases }
							hasFailedPurchases={ hasFailedPurchases }
						/>
					) }

					{ ! isSimplified && ComponentClass && (
						<div className="checkout-thank-you__purchase-details-list">
							<ComponentClass
								customizeUrl={ customizeUrl }
								domain={ domain }
								purchases={ purchases }
								failedPurchases={ failedPurchases }
								isRootDomainWithUs={ isRootDomainWithUs }
								registrarSupportUrl={ registrarSupportUrl }
								selectedSite={ selectedSite }
								selectedFeature={ getFeatureByKey( this.props.selectedFeature ) }
								sitePlans={ sitePlans }
							/>
						</div>
					) }
				</CheckoutThankYouHeader>
			</div>
		);
	};
}

export default connect(
	( state, props ) => {
		const siteId = getSelectedSiteId( state );
		const activeTheme = getActiveTheme( state, siteId );

		return {
			isProductsListFetching: isProductsListFetching( state ),
			isHappychatEligible: isHappychatUserEligible( state ),
			receipt: getReceiptById( state, props.receiptId ),
			gsuiteReceipt: props.gsuiteReceiptId ? getReceiptById( state, props.gsuiteReceiptId ) : null,
			sitePlans: getPlansBySite( state, props.selectedSite ),
			upgradeIntent: props.upgradeIntent || getCheckoutUpgradeIntent( state ),
			isSimplified:
				[ 'install_theme', 'install_plugin', 'browse_plugins' ].indexOf( props.upgradeIntent ) !==
				-1,
			user: getCurrentUser( state ),
			userDate: getCurrentUserDate( state ),
			transferComplete: transferStates.COMPLETED === getAtomicTransfer( state, siteId ).status,
			isEmailVerified: isCurrentUserEmailVerified( state ),
			selectedSiteSlug: getSiteSlug( state, siteId ),
			siteHomeUrl: getSiteHomeUrl( state, siteId ),
			customizeUrl: getCustomizeOrEditFrontPageUrl( state, activeTheme, siteId ),
			site: getSite( state, siteId ),
		};
	},
	{
		fetchAtomicTransfer,
		fetchReceipt,
		fetchSitePlans,
		refreshSitePlans,
		recordStartTransferClickInThankYou,
		requestThenActivate,
	}
)( localize( CheckoutThankYou ) );
