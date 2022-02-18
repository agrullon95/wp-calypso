import { localize, useTranslate } from 'i18n-calypso';
import { preventWidows } from 'calypso/lib/formatting';
import ThankYou from './thank-you';

const JetpackSecurityDailyThankYou = ( {
	translate,
}: {
	translate: ReturnType< typeof useTranslate >;
} ) => (
	<ThankYou
		illustration="/calypso/images/illustrations/security.svg"
		showCalypsoIntro
		showContinueButton
		title={ translate( 'Jetpack Security Daily' ) }
	>
		<p>
			{ preventWidows(
				translate(
					"We've finished setting up anti-spam, backups & malware scanning for you. You are now ready to finish the rest of your security checklist."
				)
			) }
		</p>
	</ThankYou>
);

export default localize( JetpackSecurityDailyThankYou );
