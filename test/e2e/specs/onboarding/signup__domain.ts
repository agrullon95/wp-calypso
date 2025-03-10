/**
 * @group quarantined
 */

import {
	DataHelper,
	DomainSearchComponent,
	BrowserManager,
	CloseAccountFlow,
	UserSignupPage,
	CartCheckoutPage,
	NavbarComponent,
	IndividualPurchasePage,
	SecretsManager,
} from '@automattic/calypso-e2e';
import { Page, Browser } from 'playwright';

declare const browser: Browser;

describe( DataHelper.createSuiteTitle( 'Signup: WordPress.com Domain Only' ), function () {
	const inboxId = SecretsManager.secrets.mailosaur.signupInboxId;
	const username = DataHelper.getUsername( { prefix: 'domainonly' } );
	const email = DataHelper.getTestEmailAddress( {
		inboxId: inboxId,
		prefix: username,
	} );
	const signupPassword = SecretsManager.secrets.passwordForNewTestSignUps;

	let page: Page;
	let selectedDomain: string;
	let domainSearchComponent: DomainSearchComponent;
	let cartCheckoutPage: CartCheckoutPage;

	beforeAll( async () => {
		page = await browser.newPage();
	} );

	describe( 'Signup via /start/domain', function () {
		it( 'Navigate to /start/domain', async function () {
			await page.goto( DataHelper.getCalypsoURL( '/start/domain' ) );
		} );

		it( 'Set store cookie', async function () {
			await BrowserManager.setStoreCookie( page, { currency: 'JPY' } );
		} );

		it( 'Search for a domain', async function () {
			domainSearchComponent = new DomainSearchComponent( page );
			await domainSearchComponent.search( username + '.live' );
		} );

		it( 'Select a .live domain', async function () {
			selectedDomain = await domainSearchComponent.selectDomain( '.live' );
		} );

		it( 'Select to buy just the domain', async function () {
			await page.click( 'button:text("Just buy a domain")' );
		} );

		it( 'Sign up for a WordPress.com account', async function () {
			const userSignupPage = new UserSignupPage( page );
			await userSignupPage.signup( email, username, signupPassword );
		} );

		it( 'Land in checkout cart', async function () {
			cartCheckoutPage = new CartCheckoutPage( page );
			const totalAmount = await cartCheckoutPage.getCheckoutTotalAmount();
			expect( totalAmount ).toBeGreaterThan( 0 );
		} );

		it( 'Enter registrar details', async function () {
			await cartCheckoutPage.enterDomainRegistrarDetails(
				DataHelper.getTestDomainRegistrarDetails( email )
			);
		} );

		it( 'Enter credit card details', async function () {
			await cartCheckoutPage.enterPaymentDetails( DataHelper.getTestPaymentDetails() );
		} );

		// Skipping this test because of inconsistency in cookie working in this flow
		// See GH Issue #56961 (https://github.com/Automattic/wp-calypso/issues/56961)
		it.skip( 'Prices are shown in Japanese Yen', async function () {
			const cartAmount = ( await cartCheckoutPage.getCheckoutTotalAmount( {
				rawString: true,
			} ) ) as string;
			expect( cartAmount.startsWith( '¥' ) ).toBe( true );
		} );

		it( 'Check out', async function () {
			// Purchasing a domain on a domain-only account results in multiple redirects
			// to URLs such as `**/checkout/thank-you/no-site/**` and
			// `**/checkout/thank-you/<selectedDomain>`, and this occurs multiple times.
			// The following `waitForNavigation` is meant to catch those and ensure the page
			// has loaded fully prior to next steps.
			await Promise.all( [
				page.waitForNavigation( {
					url: `**/checkout/thank-you/${ selectedDomain }`,
					timeout: 120 * 1000,
				} ),
				cartCheckoutPage.purchase( { timeout: 120 * 1000 } ),
			] );

			await page.waitForNavigation( {
				url: `**/checkout/thank-you/${ selectedDomain }`,
			} );
		} );
	} );

	describe( 'Manage Domain', function () {
		let individualPurchasePage: IndividualPurchasePage;

		it( 'Click My Sites', async function () {
			const navbarCompnent = new NavbarComponent( page );
			await navbarCompnent.clickMySites();
		} );

		it( 'Manage domain', async function () {
			// This isn't MyHomePage, nor is it PurchasesPage.
			// Instead of creating a POM for just one task, call the
			// raw selector.
			await page.click( 'a:text("Manage domain")' );
		} );

		it( 'Turn off auto-renew', async function () {
			individualPurchasePage = new IndividualPurchasePage( page );
			await individualPurchasePage.turnOffAutoRenew();
		} );

		it( 'Delete domain purchase', async function () {
			await individualPurchasePage.deleteDomain();
		} );
	} );

	describe( 'Delete user account', function () {
		it( 'Close account', async function () {
			const closeAccountFlow = new CloseAccountFlow( page );
			await closeAccountFlow.closeAccount();
		} );
	} );
} );
