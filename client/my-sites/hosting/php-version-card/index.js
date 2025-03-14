import { Button, Card, Spinner } from '@automattic/components';
import { localize } from 'i18n-calypso';
import { useState } from 'react';
import { connect } from 'react-redux';
import CardHeading from 'calypso/components/card-heading';
import QuerySitePhpVersion from 'calypso/components/data/query-site-php-version';
import FormLabel from 'calypso/components/forms/form-label';
import FormSelect from 'calypso/components/forms/form-select';
import MaterialIcon from 'calypso/components/material-icon';
import { updateAtomicPhpVersion } from 'calypso/state/hosting/actions';
import { getAtomicHostingPhpVersion } from 'calypso/state/selectors/get-atomic-hosting-php-version';
import getRequest from 'calypso/state/selectors/get-request';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';

import './style.scss';

const PhpVersionCard = ( {
	disabled,
	isUpdatingPhpVersion,
	isGettingPhpVersion,
	siteId,
	translate,
	updatePhpVersion,
	version,
} ) => {
	const [ selectedPhpVersion, setSelectedPhpVersion ] = useState( '' );

	const recommendedValue = '7.4';

	const changePhpVersion = ( event ) => {
		const newVersion = event.target.value;

		setSelectedPhpVersion( newVersion );
	};

	const updateVersion = () => {
		updatePhpVersion( siteId, selectedPhpVersion );
	};

	const getPhpVersions = () => {
		return [
			{
				label: translate( '7.3', {
					comment: 'PHP Version for a version switcher',
				} ),
				value: '7.3',
				disabled: true, // EOL 6th December, 2021
			},
			{
				label: translate( '7.4 (recommended)', {
					comment: 'PHP Version for a version switcher',
				} ),
				value: recommendedValue,
			},
			{
				label: translate( '8.0', {
					comment: 'PHP Version for a version switcher',
				} ),
				value: '8.0',
			},
			{
				label: translate( '8.1', {
					comment: 'PHP Version for a version switcher',
				} ),
				value: '8.1',
			},
		];
	};

	const getContent = () => {
		if ( isGettingPhpVersion ) {
			return;
		}

		const isButtonDisabled = disabled || ! selectedPhpVersion || selectedPhpVersion === version;
		const selectedValue = selectedPhpVersion || version || ( disabled && recommendedValue );

		return (
			<div>
				<div>
					<FormLabel>{ translate( 'Your site is currently running:' ) }</FormLabel>
					<FormSelect
						disabled={ disabled || isUpdatingPhpVersion }
						className="php-version-card__version-select"
						onChange={ changePhpVersion }
						value={ selectedValue }
					>
						{ getPhpVersions().map( ( option ) => {
							// Show disabled PHP version only if the site is still using it.
							if ( option.value !== version && option.disabled ) {
								return null;
							}

							return (
								<option
									disabled={ option.value === version }
									value={ option.value }
									key={ option.label }
								>
									{ option.label }
								</option>
							);
						} ) }
					</FormSelect>
				</div>
				{ ! isButtonDisabled && (
					<Button
						className="php-version-card__set-version"
						onClick={ updateVersion }
						busy={ isUpdatingPhpVersion }
						disabled={ isUpdatingPhpVersion }
					>
						<span>{ translate( 'Update PHP Version' ) }</span>
					</Button>
				) }
			</div>
		);
	};

	return (
		<Card className="php-version-card">
			<QuerySitePhpVersion siteId={ siteId } />
			<MaterialIcon icon="build" size={ 32 } />
			<CardHeading>{ translate( 'PHP Version' ) }</CardHeading>
			{ getContent() }
			{ isGettingPhpVersion && <Spinner /> }
		</Card>
	);
};

export default connect(
	( state, props ) => {
		const siteId = getSelectedSiteId( state );
		const version = getAtomicHostingPhpVersion( state, siteId );

		return {
			isUpdatingPhpVersion:
				getRequest( state, updateAtomicPhpVersion( siteId, null ) )?.isLoading ?? false,
			isGettingPhpVersion: ! props.disabled && ! version,
			siteId,
			version,
		};
	},
	{
		updatePhpVersion: updateAtomicPhpVersion,
	}
)( localize( PhpVersionCard ) );
