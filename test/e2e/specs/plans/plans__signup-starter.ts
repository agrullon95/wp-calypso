/**
 * @group calypso-release
 */

import {
	DataHelper,
	BrowserManager,
	SecretsManager,
	LoginPage,
	UserSignupPage,
	SignupPickPlanPage,
	StartSiteFlow,
	SidebarComponent,
	PlansPage,
	RestAPIClient,
	CartCheckoutPage,
	DomainSearchComponent,
	IndividualPurchasePage,
} from '@automattic/calypso-e2e';
import { Page, Browser } from 'playwright';
import type { NewSiteDetails } from '@automattic/calypso-e2e';

declare const browser: Browser;

describe(
	DataHelper.createSuiteTitle( 'Plans: Create a WordPress.com Starter site as new user' ),
	function () {
		const username = `e2eflowtestingfree${ DataHelper.getTimestamp() }`;
		const password = SecretsManager.secrets.passwordForNewTestSignUps;
		const email = DataHelper.getTestEmailAddress( {
			inboxId: SecretsManager.secrets.mailosaur.inviteInboxId,
			prefix: username,
		} );
		const blogName = DataHelper.getBlogName();

		let page: Page;
		let userID: number;
		let bearerToken: string;
		let siteDetails: NewSiteDetails;
		let userCreatedFlag = false;
		let siteCreatedFlag = false;

		beforeAll( async function () {
			page = await browser.newPage();
		} );

		describe( 'Register as new user', function () {
			it( 'Navigate to Signup page', async function () {
				const loginPage = new LoginPage( page );
				await loginPage.visit();
				await loginPage.clickSignUp();
			} );

			it( 'Sign up as new user', async function () {
				const userSignupPage = new UserSignupPage( page );
				const details = await userSignupPage.signup( email, username, password );
				userID = details.ID;
				bearerToken = details.bearer_token;

				userCreatedFlag = true;
			} );
		} );

		describe( 'Create new site', function () {
			let cartCheckoutPage: CartCheckoutPage;

			beforeAll( async function () {
				await BrowserManager.setStoreCookie( page );
			} );

			it( 'Select a .wordpres.com domain name', async function () {
				const domainSearchComponent = new DomainSearchComponent( page );
				await domainSearchComponent.search( blogName );
				await domainSearchComponent.selectDomain( '.wordpress.com' );
			} );

			it( 'Select WordPress.com Pro plan', async function () {
				const signupPickPlanPage = new SignupPickPlanPage( page );
				siteDetails = await signupPickPlanPage.selectPlan( 'Starter' );

				siteCreatedFlag = true;
			} );

			it( 'See secure checkout', async function () {
				cartCheckoutPage = new CartCheckoutPage( page );
				await cartCheckoutPage.validateCartItem( 'WordPress.com Starter' );
			} );

			it( 'Enter payment details', async function () {
				const paymentDetails = DataHelper.getTestPaymentDetails();
				await cartCheckoutPage.enterBillingDetails( paymentDetails );
				await cartCheckoutPage.enterPaymentDetails( paymentDetails );
			} );

			it( 'Make purchase', async function () {
				await cartCheckoutPage.purchase();
			} );

			it( 'Skip to dashboard', async function () {
				const startSiteFlow = new StartSiteFlow( page );
				await Promise.all( [
					page.waitForNavigation( { url: /.*\/home\/.*/ } ),
					startSiteFlow.clickButton( 'Skip to dashboard' ),
				] );
			} );
		} );

		describe( 'Validate WordPress.com Starter functionality', function () {
			let sidebarComponent: SidebarComponent;

			it( 'Sidebar states user is on WordPress.com Starter plan', async function () {
				sidebarComponent = new SidebarComponent( page );
				const plan = await sidebarComponent.getCurrentPlanName();
				expect( plan ).toBe( 'Starter' );
			} );

			it( 'Navigate to Upgrades > Plans', async function () {
				sidebarComponent = new SidebarComponent( page );
				await sidebarComponent.navigate( 'Upgrades', 'Plans' );
			} );

			it( 'Plans page states user is on WordPress.com Starter plan', async function () {
				const plansPage = new PlansPage( page, 'current' );
				await plansPage.clickTab( 'My Plan' );
				await plansPage.validateActivePlan( 'Starter' );
			} );
		} );

		describe( 'Cancel Plan', function () {
			it( 'View purchased upgrade details', async function () {
				const plansPage = new PlansPage( page, 'current' );
				await plansPage.managePlan();
			} );

			it( 'Cancel WordPress.com Starter plan', async function () {
				const individualPurchasePage = new IndividualPurchasePage( page );
				await individualPurchasePage.cancelPurchase();
			} );
		} );

		afterAll( async function () {
			// Skip the cleanup if neither user nor site were created.
			if ( ! userCreatedFlag && ! siteCreatedFlag ) {
				return;
			}

			const restAPIClient = new RestAPIClient(
				{ username: username, password: password },
				bearerToken
			);

			const siteDeleteResponse = await restAPIClient.deleteSite( siteDetails );

			// If the response is `null` then no action has been
			// performed.
			if ( siteDeleteResponse ) {
				// The only correct response is the string
				// "deleted".
				if ( siteDeleteResponse.status !== 'deleted' ) {
					console.warn(
						`Failed to delete siteID ${ siteDetails.id }.\nExpected: "deleted", Got: ${ siteDeleteResponse.status }`
					);
				} else {
					console.log( `Successfully deleted siteID ${ siteDetails.id }.` );
				}
			}

			if ( ! userCreatedFlag ) {
				return;
			}

			const closeAccountResponse = await restAPIClient.closeAccount( {
				userID: userID,
				username: username,
				email: email,
			} );

			if ( closeAccountResponse.success !== true ) {
				console.warn( `Failed to delete user ID ${ userID }` );
			} else {
				console.log( `Successfully deleted user ID ${ userID }` );
			}
			return closeAccountResponse;
		} );
	}
);
