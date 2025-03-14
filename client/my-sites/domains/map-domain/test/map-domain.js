/**
 * @jest-environment jsdom
 */

import { shallow } from 'enzyme';
import pageSpy from 'page';
import MapDomainStep from 'calypso/components/domains/map-domain-step';
import HeaderCake from 'calypso/components/header-cake';
import { domainManagementList } from 'calypso/my-sites/domains/paths';
import { MapDomain } from '..';

jest.mock( 'page', () => {
	const pageMock = jest.fn();
	pageMock.redirect = jest.fn();
	return pageMock;
} );

describe( 'MapDomain component', () => {
	const defaultProps = {
		cart: {},
		productsList: {},
		domainsWithPlansOnly: false,
		translate: ( string ) => string,
		isSiteUpgradeable: true,
		selectedSite: {
			ID: 500,
			slug: 'domain.com',
		},
		selectedSiteId: 500,
		selectedSiteSlug: 'domain.com',
	};

	test( 'does not blow up with default props', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } /> );
		expect( wrapper ).toHaveLength( 1 );
	} );

	test( 'redirects if site cannot be upgraded at mounting', () => {
		shallow( <MapDomain { ...defaultProps } isSiteUpgradeable={ false } /> );
		expect( pageSpy.redirect ).toBeCalledWith( '/domains/add/mapping' );
	} );

	test( 'redirects if site cannot be upgraded at new props', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } isSiteUpgradeable={ true } /> );
		wrapper.setProps( { selectedSiteId: 501, isSiteUpgradeable: false } );
		expect( pageSpy.redirect ).toBeCalledWith( '/domains/add/mapping' );
	} );

	test( 'renders a MapDomainStep', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } /> );
		expect( wrapper.find( MapDomainStep ) ).toHaveLength( 1 );
	} );

	test( "goes back when HeaderCake's onClick is fired", () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } /> );
		expect( wrapper.find( HeaderCake ).prop( 'onClick' ) ).toEqual( wrapper.instance().goBack );
	} );

	test( 'goes back to /domains/add if no selected site', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } selectedSite={ null } /> );
		wrapper.instance().goBack();
		expect( pageSpy ).toBeCalledWith( '/domains/add' );
	} );

	test( 'goes back to domain management for VIP sites', () => {
		const wrapper = shallow(
			<MapDomain
				{ ...defaultProps }
				selectedSiteSlug="baba"
				selectedSite={ { ...defaultProps.selectedSite, is_vip: true } }
			/>
		);
		wrapper.instance().goBack();
		expect( pageSpy ).toBeCalledWith( domainManagementList( 'baba' ) );
	} );

	test( 'goes back to domain add page if non-VIP site', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } selectedSiteSlug="baba" /> );
		wrapper.instance().goBack();
		expect( pageSpy ).toBeCalledWith( '/domains/add/baba' );
	} );

	test( 'does not render a notice by default', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } /> );
		// we match the notice by props, because enzyme isn't matching the Notice type for some reason
		expect( wrapper.find( { status: 'is-error' } ) ).toHaveLength( 0 );
	} );

	test( 'render a notice by when there is an errorMessage in the state', () => {
		const wrapper = shallow( <MapDomain { ...defaultProps } /> );
		// we match the notice by props, because enzyme isn't matching the Notice type for some reason
		wrapper.setState( { errorMessage: 'baba' } );
		expect( wrapper.find( { status: 'is-error' } ) ).toHaveLength( 1 );
	} );
} );
