import { Button } from '@automattic/components';
import { shallow } from 'enzyme';
import { UpgradeATStep } from '../upgrade-at-step';

const noop = () => {};

describe( 'UpgradeATStep', () => {
	const selectedSite = { slug: 'site_slug' };

	describe( 'rendering translated content', () => {
		let wrapper;
		const translate = ( content ) => `Translated: ${ content }`;

		beforeEach( () => {
			wrapper = shallow(
				<UpgradeATStep
					recordTracksEvent={ noop }
					translate={ translate }
					selectedSite={ selectedSite }
				/>
			);
		} );

		test( 'should render translated heading content', () => {
			expect( wrapper.find( 'FormSectionHeading' ).props().children ).toEqual(
				'Translated: New! Install Custom Plugins and Themes'
			);
		} );

		test( 'should render translated link content', () => {
			expect( wrapper.find( 'FormFieldset > p' ).props().children ).toEqual(
				'Translated: Did you know that you can now use third-party plugins and themes on the WordPress.com Business plan? ' +
					'Claim a 25% discount when you upgrade your site today - {{b}}enter the code BIZC25 at checkout{{/b}}.'
			);
		} );

		test( 'should render translated confirmation content', () => {
			expect( wrapper.find( 'FormFieldset > ForwardRef(Button)' ).props().children ).toEqual(
				'Translated: Upgrade My Site'
			);
		} );
	} );

	test( 'should render button with link to business plan checkout', () => {
		const wrapper = shallow(
			<UpgradeATStep recordTracksEvent={ noop } translate={ noop } selectedSite={ selectedSite } />
		);

		expect( wrapper.find( Button ).props().href ).toEqual(
			'/checkout/site_slug/business?coupon=BIZC25'
		);
	} );

	test( 'should fire tracks event when button is clicked', () => {
		const recordTracksEvent = jest.fn();
		const wrapper = shallow(
			<UpgradeATStep
				recordTracksEvent={ recordTracksEvent }
				translate={ noop }
				selectedSite={ selectedSite }
			/>
		);

		wrapper.find( Button ).simulate( 'click' );

		expect( recordTracksEvent ).toHaveBeenCalledWith(
			'calypso_cancellation_upgrade_at_step_upgrade_click'
		);
	} );
} );
