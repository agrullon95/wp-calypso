import { Button, Card, Spinner } from '@automattic/components';
import { useTranslate } from 'i18n-calypso';
import { ReactElement } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CardHeading from 'calypso/components/card-heading';
import QueryJetpackPartnerPortalPartner from 'calypso/components/data/query-jetpack-partner-portal-partner';
import Main from 'calypso/components/main';
import { useReturnUrl } from 'calypso/jetpack-cloud/sections/partner-portal/hooks';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import { setActivePartnerKey } from 'calypso/state/partner-portal/partner/actions';
import {
	isFetchingPartner,
	getCurrentPartner,
	hasActivePartnerKey,
	hasFetchedPartner,
} from 'calypso/state/partner-portal/partner/selectors';
import { PartnerKey } from 'calypso/state/partner-portal/types';
import './style.scss';

export default function SelectPartnerKey(): ReactElement | null {
	const translate = useTranslate();
	const dispatch = useDispatch();
	const hasKey = useSelector( hasActivePartnerKey );
	const hasFetched = useSelector( hasFetchedPartner );
	const isFetching = useSelector( isFetchingPartner );
	const partner = useSelector( getCurrentPartner );
	const keys = ( partner?.keys || [] ) as PartnerKey[];
	const showKeys = hasFetched && ! isFetching && keys.length > 0;

	const onSelectPartnerKey = ( keyId: number ) => {
		dispatch( setActivePartnerKey( keyId ) );
		dispatch( recordTracksEvent( 'calypso_partner_portal_select_partner_key_click' ) );
	};

	useReturnUrl( hasKey );

	return (
		<Main className="select-partner-key">
			<QueryJetpackPartnerPortalPartner />

			<CardHeading size={ 36 }>{ translate( 'Licensing' ) }</CardHeading>

			{ isFetching && <Spinner /> }

			{ showKeys && (
				<div>
					<p>{ translate( 'Please select your partner key:' ) }</p>

					{ keys.map( ( key ) => (
						<Card key={ key.id } className="select-partner-key__card" compact>
							<div className="select-partner-key__key-name">{ key.name }</div>
							<Button primary onClick={ () => onSelectPartnerKey( key.id ) }>
								{ translate( 'Select' ) }
							</Button>
						</Card>
					) ) }
				</div>
			) }
		</Main>
	);
}
