/**
 * @jest-environment jsdom
 */
import { shallow } from 'enzyme';
import { EditorMediaModalDetailItem as DetailItem } from '../detail-item';

jest.mock( 'calypso/post-editor/media-modal/detail/detail-fields', () =>
	require( 'calypso/components/empty-component' )
);
jest.mock( 'calypso/post-editor/media-modal/detail/detail-file-info', () =>
	require( 'calypso/components/empty-component' )
);

/**
 * Module variables
 */
const DUMMY_SITE = { ID: 1 };

const DUMMY_IMAGE_MEDIA = {
	ID: 100,
	date: '2015-06-19T11:36:09-04:00',
	mime_type: 'image/jpeg',
	guid: 'http://wordpress.com/test.jpg',
	URL: 'http://wordpress.com/test.jpg',
};

const DUMMY_VIDEO_MEDIA = {
	ID: 200,
	date: '2015-06-19T11:36:09-04:00',
	mime_type: 'video/mp4',
	videopress_guid: 'testvideopressguid123',
	guid: 'http://wordpress.com/test.mp4',
	URL: 'http://wordpress.com/test.mp4',
};

const SHARED_PROPS = {
	site: DUMMY_SITE,
	canUserUploadFiles: true,
	translate: ( str ) => str,
};

describe( 'EditorMediaModalDetailItem', () => {
	const isVideoPressEnabled = jest.fn( () => true );

	test( 'should display at least one edit button for a VideoPress video on a public site', () => {
		const tree = shallow(
			<DetailItem
				item={ DUMMY_VIDEO_MEDIA }
				isVideoPressEnabled={ isVideoPressEnabled }
				{ ...SHARED_PROPS }
			/>
		);

		const editButton = tree.find( '.editor-media-modal-detail__edit' );

		expect( editButton.length ).toBeGreaterThanOrEqual( 1 );
	} );

	test( 'should display at least one edit button for a VideoPress video on a private site', () => {
		const tree = shallow(
			<DetailItem
				item={ DUMMY_VIDEO_MEDIA }
				isVideoPressEnabled={ isVideoPressEnabled }
				isSitePrivate={ true }
				{ ...SHARED_PROPS }
			/>
		);

		const editButton = tree.find( '.editor-media-modal-detail__edit' );

		expect( editButton.length ).toBeGreaterThanOrEqual( 1 );
	} );

	test( 'should display at least one edit button for an image on a public site', () => {
		const tree = shallow( <DetailItem item={ DUMMY_IMAGE_MEDIA } { ...SHARED_PROPS } /> );

		const editButton = tree.find( '.editor-media-modal-detail__edit' );

		expect( editButton.length ).toBeGreaterThanOrEqual( 1 );
	} );

	test( 'should not display edit button for an image on a private site', () => {
		const tree = shallow(
			<DetailItem item={ DUMMY_IMAGE_MEDIA } isSitePrivate={ true } { ...SHARED_PROPS } />
		);

		const editButton = tree.find( '.editor-media-modal-detail__edit' );

		expect( editButton ).toHaveLength( 0 );
	} );
} );
