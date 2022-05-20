<?php
/**
 * WP_REST_WPCOM_Whats_New_List file.
 *
 * @package A8C\FSE
 */

namespace A8C\FSE;

use Automattic\Jetpack\Connection\Client;

/**
 * Class WP_REST_WPCOM_Whats_New_List.
 */
class WP_REST_WPCOM_Whats_New_List extends \WP_REST_Controller {
	/**
	 * WP_REST_WPCOM_Block_Editor_Whats_New_Dot_Controller constructor.
	 */
	public function __construct() {
		$this->namespace = 'wpcom/v2';
	}

	/**
	 * Register available routes.
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/whats-new/announcements',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_announcements' ),
					'permission_callback' => array( $this, 'permission_callback' ),
					'args'                => array(
						'_locale' => array(
							'type'        => 'string',
							'description' => 'locale of the client app, also variations are accepted but filtered out in logic',
						),
						'app_id'  => array(
							'type'        => 'integer',
							'description' => 'unique application id of the client app (for example getting a 1 here is WORDPRESS_ANDROID_APP_ID)',
						),
					),
				),
			)
		);
	}

	/**
	 * Get json of announcements to be displayed
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return mixed
	 */
	public function get_announcements( \WP_REST_Request $request ) {
		$locale   = $request->get_params()['_locale'];
		$args     = array( 'method' => 'get' );
		$endpoint = "whats-new/list?_locale={ $locale }";
		$response = Client::wpcom_json_api_request_as_blog( $endpoint, 'v2', $args, null, 'wpcom' );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		return json_decode( wp_remote_retrieve_body( $response ) );
	}

	/**
	 * Callback to determine whether the request can proceed.
	 *
	 * @return boolean
	 */
	public function permission_callback() {
		return is_user_logged_in();
	}

}
