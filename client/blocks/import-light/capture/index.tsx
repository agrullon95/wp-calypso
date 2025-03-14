import { localize, translate } from 'i18n-calypso';
import React from 'react';
import FormattedHeader from 'calypso/components/formatted-header';
import CaptureInput from './capture-input';
import type { FunctionComponent } from 'react';

import './style.scss';

/* eslint-disable wpcalypso/jsx-classname-namespace */

interface Props {
	translate: typeof translate;
}
const Capture: FunctionComponent< Props > = ( props ) => {
	const { translate } = props;

	return (
		<div className={ 'import-layout__center' }>
			<div className={ 'import-layout' }>
				<div className={ 'import-layout__column' }>
					<div className="import__heading">
						<FormattedHeader
							align={ 'left' }
							headerText={ translate( 'What’s your existing site address?' ) }
							subHeaderText={ translate(
								'After a brief scan, we’ll prompt with what we can import.'
							) }
						/>
						<div className={ 'step-wrapper__header-image' }>
							<img alt="Light import" src="/calypso/images/importer/onboarding-4.svg" />
						</div>
					</div>
				</div>
				<div className={ 'import-layout__column' }>
					<CaptureInput />
				</div>
			</div>
		</div>
	);
};

export default localize( Capture );
