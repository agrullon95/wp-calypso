import debugFactory from 'debug';
import { localize } from 'i18n-calypso';
import { flowRight, isEqual, keys, omit, pick } from 'lodash';
import { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import QueryJetpackSettings from 'calypso/components/data/query-jetpack-settings';
import QuerySiteSettings from 'calypso/components/data/query-site-settings';
import { protectForm } from 'calypso/lib/protect-form';
import trackForm from 'calypso/lib/track-form';
import { recordGoogleEvent, recordTracksEvent } from 'calypso/state/analytics/actions';
import { activateModule } from 'calypso/state/jetpack/modules/actions';
import { saveJetpackSettings } from 'calypso/state/jetpack/settings/actions';
import { removeNotice, successNotice, errorNotice } from 'calypso/state/notices/actions';
import getCurrentRouteParameterized from 'calypso/state/selectors/get-current-route-parameterized';
import getJetpackSettings from 'calypso/state/selectors/get-jetpack-settings';
import getRequest from 'calypso/state/selectors/get-request';
import isJetpackSettingsSaveFailure from 'calypso/state/selectors/is-jetpack-settings-save-failure';
import isRequestingJetpackSettings from 'calypso/state/selectors/is-requesting-jetpack-settings';
import isSiteAutomatedTransfer from 'calypso/state/selectors/is-site-automated-transfer';
import isSiteP2Hub from 'calypso/state/selectors/is-site-p2-hub';
import isUpdatingJetpackSettings from 'calypso/state/selectors/is-updating-jetpack-settings';
import { saveSiteSettings } from 'calypso/state/site-settings/actions';
import { saveP2SiteSettings } from 'calypso/state/site-settings/p2/actions';
import {
	isRequestingSiteSettings,
	isSavingSiteSettings,
	isSiteSettingsSaveSuccessful,
	getSiteSettingsSaveError,
	getSiteSettings,
} from 'calypso/state/site-settings/selectors';
import { isJetpackSite } from 'calypso/state/sites/selectors';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';

const debug = debugFactory( 'calypso:site-settings' );

const wrapSettingsForm = ( getFormSettings ) => ( SettingsForm ) => {
	class WrappedSettingsForm extends Component {
		state = {
			uniqueEvents: {},
		};

		componentDidMount() {
			this.props.replaceFields( getFormSettings( this.props.settings ) );
		}

		componentDidUpdate( prevProps ) {
			if ( prevProps.siteId !== this.props.siteId ) {
				this.props.clearDirtyFields();
				const newSiteFields = getFormSettings( this.props.settings );
				this.props.replaceFields( newSiteFields, undefined, false );
			} else if (
				! isEqual( prevProps.settings, this.props.settings ) ||
				! isEqual( prevProps.fields, this.props.fields )
			) {
				this.updateDirtyFields();
			}

			const noticeSettings = {
				id: 'site-settings-save',
				duration: 10000,
			};
			if ( ! this.props.isSavingSettings && prevProps.isSavingSettings ) {
				if (
					this.props.isSaveRequestSuccessful &&
					( this.props.isJetpackSaveRequestSuccessful || ! this.props.siteIsJetpack )
				) {
					this.props.successNotice(
						this.props.translate( 'Settings saved successfully!' ),
						noticeSettings
					);
					// Upon failure to save Jetpack Settings, don't show an error message,
					// since the JP settings data layer already does that for us.
				} else if ( ! this.props.isSaveRequestSuccessful ) {
					let text = this.props.translate(
						'There was a problem saving your changes. Please try again.'
					);
					switch ( this.props.siteSettingsSaveError ) {
						case 'invalid_ip':
							text = this.props.translate(
								'One of your IP Addresses was invalid. Please try again.'
							);
							break;
					}
					this.props.errorNotice( text, noticeSettings );
				}
			} else if (
				this.props.siteIsJetpack &&
				this.props.saveInstantSearchRequest?.status === 'success' &&
				( typeof prevProps.saveInstantSearchRequest?.lastUpdated === 'undefined' ||
					prevProps.saveInstantSearchRequest?.lastUpdated <
						this.props.saveInstantSearchRequest?.lastUpdated ) &&
				this.props.siteId === prevProps.siteId
			) {
				// NOTE: 1. the condition is pretty messy - the problem is that, if a request is the same
				//          as a previous request, the status of the request doesn't change to 'pending' from 'success'
				//          in state.dataRequests. will submit a bug and track separately.
				//       2. Error notices are dealt in jetpack data layer, we don't need to worry about errors
				this.props.successNotice(
					this.props.translate( 'Settings saved successfully!' ),
					noticeSettings
				);
			}
		}

		updateDirtyFields() {
			const currentFields = this.props.fields;
			const persistedFields = getFormSettings( this.props.settings );

			// Compute the dirty fields by comparing the persisted and the current fields
			const previousDirtyFields = this.props.dirtyFields;
			/*eslint-disable eqeqeq*/
			const nextDirtyFields = previousDirtyFields.filter( ( field ) =>
				currentFields[ field ] !== null && typeof currentFields[ field ] === 'object'
					? ! isEqual( currentFields[ field ], persistedFields[ field ] )
					: ! ( currentFields[ field ] == persistedFields[ field ] )
			);
			/*eslint-enable eqeqeq*/

			// Update the dirty fields state without updating their values
			if ( nextDirtyFields.length === 0 ) {
				this.props.markSaved();
			} else {
				this.props.markChanged();
			}
			this.props.clearDirtyFields();
			this.props.updateFields( pick( currentFields, nextDirtyFields ) );

			// Set the new non dirty fields
			const nextNonDirtyFields = omit( persistedFields, nextDirtyFields );
			this.props.replaceFields( nextNonDirtyFields );
		}

		// Some Utils
		handleSubmitForm = ( event ) => {
			const { dirtyFields, fields, trackTracksEvent, path } = this.props;

			if ( event && ! event.isDefaultPrevented() && event.nativeEvent ) {
				event.preventDefault();
			}
			dirtyFields.map( function ( value ) {
				switch ( value ) {
					case 'blogdescription':
						trackTracksEvent( 'calypso_settings_site_tagline_updated', { path } );
						break;
					case 'blogname':
						trackTracksEvent( 'calypso_settings_site_title_updated', { path } );
						break;
					case 'blog_public':
						trackTracksEvent( 'calypso_settings_site_privacy_updated', {
							privacy: fields.blog_public,
							path,
						} );
						break;
					case 'wga':
						trackTracksEvent( 'calypso_seo_settings_google_analytics_updated', { path } );
						break;
					case 'jetpack_cloudflare_analytics':
						trackTracksEvent( 'calypso_seo_settings_jetpack_cloudflare_analytics_updated', {
							path,
						} );
						break;
				}
			} );
			this.submitForm();
			this.props.trackEvent( 'Clicked Save Settings Button' );
		};

		submitForm = () => {
			const { dirtyFields, fields, jetpackFieldsToUpdate, settingsFields, siteId, siteIsJetpack } =
				this.props;
			this.props.removeNotice( 'site-settings-save' );
			debug( 'submitForm', { fields, settingsFields } );

			if ( siteIsJetpack ) {
				this.props.saveJetpackSettings( siteId, jetpackFieldsToUpdate );
			}

			if ( typeof fields?.p2_preapproved_domains !== 'undefined' ) {
				return this.props.saveP2SiteSettings( siteId, fields );
			}

			const siteFields = pick( fields, settingsFields.site );
			const modifiedFields = pick( siteFields, dirtyFields );

			this.props.saveSiteSettings( siteId, modifiedFields );
		};

		handleRadio = ( event ) => {
			const currentTargetName = event.currentTarget.name;
			const currentTargetValue = event.currentTarget.value;

			this.props.trackEvent( `Set ${ currentTargetName } to ${ currentTargetValue }` );
			this.props.updateFields( { [ currentTargetName ]: currentTargetValue } );
		};

		handleAutosavingRadio = ( name, value ) => () => {
			const { fields } = this.props;
			if ( fields[ name ] === value ) {
				return;
			}

			this.props.trackEvent( `Set ${ name } to ${ value }` );
			this.props.updateFields( { [ name ]: value }, () => {
				this.submitForm();
			} );
		};

		handleSelect = ( event ) => {
			const { name, value } = event.currentTarget;
			// Attempt to cast numeric fields value to int
			const parsedValue = parseInt( value, 10 );
			this.props.updateFields( { [ name ]: Number.isNaN( parsedValue ) ? value : parsedValue } );
		};

		handleToggle = ( name ) => () => {
			this.props.trackEvent( `Toggled ${ name }` );
			this.props.updateFields( { [ name ]: ! this.props.fields[ name ] } );
		};

		handleAutosavingToggle = ( name ) => () => {
			this.props.trackEvent( `Toggled ${ name }` );
			this.props.trackTracksEvent( 'calypso_settings_autosaving_toggle_updated', {
				name,
				path: this.props.path,
			} );
			this.props.updateFields( { [ name ]: ! this.props.fields[ name ] }, () => {
				this.submitForm();
			} );
		};

		onChangeField = ( field ) => ( event ) => {
			const value = event.target.value;
			debug( 'onChangeField', { field, value } );
			this.props.updateFields( {
				[ field ]: value,
			} );
		};

		setFieldValue = ( field, value, autosave = false ) => {
			debug( 'setFieldValue', { field, value } );
			this.props.updateFields(
				{
					[ field ]: value,
				},
				() => {
					autosave && this.submitForm();
				}
			);
		};

		uniqueEventTracker = ( message ) => () => {
			if ( this.state.uniqueEvents[ message ] ) {
				return;
			}
			const uniqueEvents = {
				...this.state.uniqueEvents,
				[ message ]: true,
			};
			this.setState( { uniqueEvents } );
			this.props.trackEvent( message );
		};

		render() {
			const utils = {
				handleRadio: this.handleRadio,
				handleSelect: this.handleSelect,
				handleSubmitForm: this.handleSubmitForm,
				handleToggle: this.handleToggle,
				handleAutosavingToggle: this.handleAutosavingToggle,
				handleAutosavingRadio: this.handleAutosavingRadio,
				onChangeField: this.onChangeField,
				setFieldValue: this.setFieldValue,
				submitForm: this.submitForm,
				uniqueEventTracker: this.uniqueEventTracker,
				updateFields: this.props.updateFields,
			};

			return (
				<div>
					<QuerySiteSettings siteId={ this.props.siteId } />
					{ this.props.siteIsJetpack && <QueryJetpackSettings siteId={ this.props.siteId } /> }
					<SettingsForm { ...this.props } { ...utils } />
				</div>
			);
		}
	}

	const connectComponent = connect(
		( state, { fields } ) => {
			const siteId = getSelectedSiteId( state );
			let isSavingSettings = isSavingSiteSettings( state, siteId );
			const isSaveRequestSuccessful = isSiteSettingsSaveSuccessful( state, siteId );
			let settings = getSiteSettings( state, siteId );
			let isRequestingSettings = isRequestingSiteSettings( state, siteId ) && ! settings;
			let isJetpackSaveRequestSuccessful;
			let jetpackFieldsToUpdate;
			let saveInstantSearchRequest;
			const siteSettingsSaveError = getSiteSettingsSaveError( state, siteId );
			const settingsFields = {
				site: keys( settings ),
			};
			const path = getCurrentRouteParameterized( state, siteId );

			const isJetpack = isJetpackSite( state, siteId );

			if ( isJetpack ) {
				const jetpackSettings = getJetpackSettings( state, siteId );
				settings = { ...settings, ...jetpackSettings };
				settingsFields.jetpack = keys( jetpackSettings );
				const fieldsToUpdate = /^error_/.test( fields.lang_id )
					? omit( fields, 'lang_id' )
					: fields;
				jetpackFieldsToUpdate = pick( fieldsToUpdate, settingsFields.jetpack );
				isSavingSettings =
					isSavingSettings || isUpdatingJetpackSettings( state, siteId, jetpackFieldsToUpdate );
				isJetpackSaveRequestSuccessful = ! isJetpackSettingsSaveFailure(
					state,
					siteId,
					jetpackFieldsToUpdate
				);
				isRequestingSettings =
					isRequestingSettings ||
					( isRequestingJetpackSettings( state, siteId ) && ! jetpackSettings );
				saveInstantSearchRequest = getRequest(
					state,
					saveJetpackSettings( siteId, {
						instant_search_enabled: jetpackFieldsToUpdate.instant_search_enabled,
					} )
				);
			}

			return {
				isJetpackSaveRequestSuccessful,
				isRequestingSettings,
				isSavingSettings,
				isSaveRequestSuccessful,
				jetpackFieldsToUpdate,
				path,
				siteIsJetpack: isJetpack,
				siteIsAtomic: isSiteAutomatedTransfer( state, siteId ),
				siteIsP2Hub: isSiteP2Hub( state, siteId ),
				siteSettingsSaveError,
				settings,
				settingsFields,
				siteId,
				saveInstantSearchRequest,
			};
		},
		( dispatch ) => {
			const boundActionCreators = bindActionCreators(
				{
					errorNotice,
					recordTracksEvent,
					removeNotice,
					saveSiteSettings,
					successNotice,
					saveJetpackSettings,
					saveP2SiteSettings,
					activateModule,
				},
				dispatch
			);
			const trackEvent = ( name ) => dispatch( recordGoogleEvent( 'Site Settings', name ) );
			const trackTracksEvent = ( name, props ) => dispatch( recordTracksEvent( name, props ) );
			return {
				...boundActionCreators,
				eventTracker: ( message ) => () => trackEvent( message ),
				trackTracksEvent,
				trackEvent,
			};
		}
	);

	return flowRight( trackForm, protectForm, connectComponent, localize )( WrappedSettingsForm );
};

export default wrapSettingsForm;
