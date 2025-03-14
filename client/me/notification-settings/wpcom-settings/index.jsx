import { Card } from '@automattic/components';
import { localize } from 'i18n-calypso';
import { get } from 'lodash';
import { Component } from 'react';
import { connect } from 'react-redux';
import FormattedHeader from 'calypso/components/formatted-header';
import FormSectionHeading from 'calypso/components/forms/form-section-heading';
import Main from 'calypso/components/main';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import twoStepAuthorization from 'calypso/lib/two-step-authorization';
import ReauthRequired from 'calypso/me/reauth-required';
import {
	fetchSettings,
	toggleWPcomEmailSetting,
	saveSettings,
} from 'calypso/state/notification-settings/actions';
import {
	getNotificationSettings,
	hasUnsavedNotificationSettingsChanges,
} from 'calypso/state/notification-settings/selectors';
import hasJetpackSites from 'calypso/state/selectors/has-jetpack-sites';
import Navigation from '../navigation';
import ActionButtons from '../settings-form/actions';
import EmailCategory from './email-category';

import './style.scss';

/**
 * Module variables
 */
const options = {
	marketing: 'marketing',
	research: 'research',
	community: 'community',
	promotion: 'promotion',
	news: 'news',
	digest: 'digest',
	jetpack_marketing: 'jetpack_marketing',
	jetpack_research: 'jetpack_research',
	jetpack_promotion: 'jetpack_promotion',
	jetpack_news: 'jetpack_news',
	jetpack_reports: 'jetpack_reports',
};

class WPCOMNotifications extends Component {
	static displayName = 'WPCOMNotifications';

	// TODO: Add propTypes

	componentDidMount() {
		this.props.fetchSettings();
	}

	toggleSetting = ( setting ) => {
		this.props.toggleWPcomEmailSetting( setting );
	};

	saveSettings = () => {
		this.props.saveSettings( 'wpcom', this.props.settings );
	};

	renderWpcomPreferences = () => {
		const { settings, translate } = this.props;

		return (
			<div>
				<p>
					{ translate(
						"We'll always send important emails regarding your account, security, " +
							'privacy, and purchase transactions, but you can get some helpful extras, too.'
					) }
				</p>

				<FormSectionHeading>
					{ this.props.translate( 'Email from WordPress.com' ) }
				</FormSectionHeading>

				<EmailCategory
					name={ options.marketing }
					isEnabled={ get( settings, options.marketing ) }
					title={ translate( 'Suggestions' ) }
					description={ translate( 'Tips for getting the most out of WordPress.com.' ) }
				/>

				<EmailCategory
					name={ options.research }
					isEnabled={ get( settings, options.research ) }
					title={ translate( 'Research' ) }
					description={ translate(
						'Opportunities to participate in WordPress.com research and surveys.'
					) }
				/>

				<EmailCategory
					name={ options.community }
					isEnabled={ get( settings, options.community ) }
					title={ translate( 'Community' ) }
					description={ translate(
						'Information on WordPress.com courses and events (online and in-person).'
					) }
				/>

				<EmailCategory
					name={ options.promotion }
					isEnabled={ get( settings, options.promotion ) }
					title={ translate( 'Promotions' ) }
					description={ translate(
						'Sales and promotions for WordPress.com products and services.'
					) }
				/>

				<EmailCategory
					name={ options.news }
					isEnabled={ get( settings, options.news ) }
					title={ translate( 'Newsletter' ) }
					description={ translate( 'WordPress.com news, announcements, and product spotlights.' ) }
				/>

				<EmailCategory
					name={ options.digest }
					isEnabled={ get( settings, options.digest ) }
					title={ translate( 'Digests' ) }
					description={ translate(
						'Popular content from the blogs you follow, and reports on ' +
							'your own site and its performance.'
					) }
				/>

				{ this.props.hasJetpackSites ? (
					<>
						<FormSectionHeading>
							{ this.props.translate( 'Email from Jetpack' ) }
						</FormSectionHeading>

						<EmailCategory
							name={ options.jetpack_marketing }
							isEnabled={ get( settings, options.jetpack_marketing ) }
							title={ translate( 'Suggestions' ) }
							description={ translate( 'Tips for getting the most out of Jetpack.' ) }
						/>

						<EmailCategory
							name={ options.jetpack_research }
							isEnabled={ get( settings, options.jetpack_research ) }
							title={ translate( 'Research' ) }
							description={ translate(
								'Opportunities to participate in Jetpack research and surveys.'
							) }
						/>

						<EmailCategory
							name={ options.jetpack_promotion }
							isEnabled={ get( settings, options.jetpack_promotion ) }
							title={ translate( 'Promotions' ) }
							description={ translate( 'Sales and promotions for Jetpack products and services.' ) }
						/>

						<EmailCategory
							name={ options.jetpack_news }
							isEnabled={ get( settings, options.jetpack_news ) }
							title={ translate( 'Newsletter' ) }
							description={ translate( 'Jetpack news, announcements, and product spotlights.' ) }
						/>

						<EmailCategory
							name={ options.jetpack_reports }
							isEnabled={ get( settings, options.jetpack_reports ) }
							title={ translate( 'Reports' ) }
							description={ translate( 'Jetpack security and performance reports.' ) }
						/>
					</>
				) : (
					''
				) }

				<ActionButtons onSave={ this.saveSettings } disabled={ ! this.props.hasUnsavedChanges } />
			</div>
		);
	};

	renderPlaceholder = () => {
		return <p className="wpcom-settings__notification-settings-placeholder">&nbsp;</p>;
	};

	render() {
		return (
			<Main wideLayout className="wpcom-settings__main">
				<PageViewTracker
					path="/me/notifications/updates"
					title="Me > Notifications > Updates from WordPress.com"
				/>
				<ReauthRequired twoStepAuthorization={ twoStepAuthorization } />
				<FormattedHeader
					brandFont
					headerText={ this.props.translate( 'Notification Settings' ) }
					align="left"
				/>

				<Navigation path={ this.props.path } />

				<Card>
					{ this.props.settings ? this.renderWpcomPreferences() : this.renderPlaceholder() }
				</Card>
			</Main>
		);
	}
}

export default connect(
	( state ) => ( {
		settings: getNotificationSettings( state, 'wpcom' ),
		hasUnsavedChanges: hasUnsavedNotificationSettingsChanges( state, 'wpcom' ),
		hasJetpackSites: hasJetpackSites( state ),
	} ),
	{ fetchSettings, toggleWPcomEmailSetting, saveSettings }
)( localize( WPCOMNotifications ) );
