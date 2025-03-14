// eslint-disable-next-line import/default
import productsValues from '@automattic/calypso-products';
import { isRefundable, getSubscriptionEndDate } from 'calypso/lib/purchases';
import { cancellationEffectDetail, cancellationEffectHeadline } from '../cancellation-effect';

jest.mock( '@automattic/calypso-products', () => ( {} ) );
jest.mock( 'calypso/lib/purchases', () => ( {
	getName: jest.fn( () => 'purchase name' ),
	isRefundable: jest.fn(),
	getSubscriptionEndDate: jest.fn(),
} ) );

describe( 'cancellation-effect', () => {
	const purchase = { domain: 'example.com' };
	let translate;

	beforeEach( () => {
		translate = ( text, args ) => ( { args, text } );
	} );

	describe( 'cancellationEffectHeadline', () => {
		describe( 'when refundable', () => {
			beforeEach( () => {
				isRefundable.mockImplementation( () => true );
			} );

			test( 'should return translation of cancel and return', () => {
				const headline = cancellationEffectHeadline( purchase, translate );
				expect( headline.text ).toEqual(
					'Are you sure you want to cancel and remove %(purchaseName)s from {{em}}%(domain)s{{/em}}? '
				);
			} );
		} );

		describe( 'when not refundable', () => {
			beforeEach( () => {
				isRefundable.mockImplementation( () => false );
			} );

			test( 'should return translation of cancel', () => {
				const headline = cancellationEffectHeadline( purchase, translate );
				expect( headline.text ).toEqual(
					'Are you sure you want to cancel %(purchaseName)s for {{em}}%(domain)s{{/em}}? '
				);
			} );
		} );
	} );

	describe( 'cancellationEffectDetail', () => {
		describe( 'when refundable', () => {
			beforeEach( () => {
				isRefundable.mockImplementation( () => true );
			} );

			test( 'should return translation of theme message when product is a theme', () => {
				productsValues.isTheme = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					"Your site's appearance will revert to its previously selected theme and you will be refunded %(cost)s."
				);
			} );

			test( 'should return translation of g suite message when product is g suite', () => {
				productsValues.isTheme = () => false;
				productsValues.isGSuiteOrGoogleWorkspace = () => true;
				productsValues.isGSuiteProductSlug = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					'You will be refunded %(cost)s, and your %(googleMailService)s account will continue working without interruption. You will be able to set up billing for your account directly with Google.'
				);
			} );

			test( 'should return translation of jetpack plan message when product is a jetpack plan', () => {
				productsValues.isTheme = () => false;
				productsValues.isGSuiteOrGoogleWorkspace = () => false;
				productsValues.isJetpackPlan = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					'All plan features - spam filtering, backups, and security screening ' +
						'- will be removed from your site and you will be refunded %(cost)s.'
				);
			} );

			test( 'should return translation of plan message when product is not a theme, g suite or a jetpack plan', () => {
				productsValues.isTheme = () => false;
				productsValues.isGSuiteOrGoogleWorkspace = () => false;
				productsValues.isJetpackPlan = () => false;
				productsValues.isDotComPlan = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					'All plan features and custom changes will be removed from your site and you will be refunded %(cost)s.'
				);
			} );

			test( 'should return the default when all the product specific conditions are false', () => {
				productsValues.isTheme = () => false;
				productsValues.isGSuiteOrGoogleWorkspace = () => false;
				productsValues.isJetpackPlan = () => false;
				productsValues.isDotComPlan = () => false;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual( 'You will be refunded %(cost)s.' );
			} );
		} );

		describe( 'when not refundable', () => {
			beforeEach( () => {
				isRefundable.mockImplementation( () => false );
				getSubscriptionEndDate.mockImplementation( () => '15/12/2093' );
			} );

			test( 'should return translation of g suite message when product is g suite', () => {
				productsValues.isGSuiteOrGoogleWorkspace = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					'Your %(googleMailService)s account remains active until it expires on %(subscriptionEndDate)s.'
				);
			} );

			test( 'should return translation of domain mapping message when product is a domain mapping', () => {
				productsValues.isGSuiteOrGoogleWorkspace = () => false;
				productsValues.isDomainMapping = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					'Your domain mapping remains active until it expires on %(subscriptionEndDate)s.'
				);
			} );

			test( 'should return translation of plan message when product is not g suite or a domain mapping', () => {
				productsValues.isGSuiteOrGoogleWorkspace = () => false;
				productsValues.isDomainMapping = () => false;
				productsValues.isPlan = () => true;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline.text ).toEqual(
					"Your plan's features remain active until your subscription expires on %(subscriptionEndDate)s."
				);
			} );

			test( 'should return an empty message when all the above product specific conditions are false.', () => {
				productsValues.isGSuiteOrGoogleWorkspace = () => false;
				productsValues.isDomainMapping = () => false;
				productsValues.isPlan = () => false;
				const headline = cancellationEffectDetail( purchase, translate );
				expect( headline ).toEqual( '' );
			} );
		} );
	} );
} );
