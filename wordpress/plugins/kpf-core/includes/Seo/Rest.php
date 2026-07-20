<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use KPF\Core\Seo\Redirects\Matcher;
use KPF\Core\Seo\Redirects\Repository as RedirectRepository;
use KPF\Core\Seo\Tags\Engine;
use KPF\Core\Seo\Tags\Registry;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

final class Rest {
	public static function register(): void {
		add_action('rest_api_init', array( self::class, 'routes' ));
	}

	public static function routes(): void {
		register_rest_route(
			'kpf-seo/v1',
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'get_settings' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( self::class, 'update_settings' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/tags',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'get_tags' ),
				'permission_callback' => array( self::class, 'can_edit' ),
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/preview',
			array(
				'methods'             => 'POST',
				'callback'            => array( self::class, 'preview' ),
				'permission_callback' => array( self::class, 'can_edit' ),
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/resolve/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'resolve_post' ),
					'permission_callback' => array( self::class, 'can_edit' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'resolve_post' ),
					'permission_callback' => array( self::class, 'can_edit' ),
				),
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/redirects',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( self::class, 'list_redirects' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'create_redirect' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/redirects/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( self::class, 'update_redirect' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( self::class, 'delete_redirect' ),
					'permission_callback' => array( self::class, 'can_manage' ),
				),
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/public/redirect',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'public_redirect' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/public/robots',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'public_robots' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/public/sitemap',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'public_sitemap_index' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/public/sitemap/(?P<type>[a-z0-9_-]+)/(?P<page>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( self::class, 'public_sitemap_page' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'kpf-seo/v1',
			'/conflicts',
			array(
				'methods'             => 'GET',
				'callback'            => static function () {
					return rest_ensure_response(array( 'conflicts' => Conflicts::active_conflicts() ));
				},
				'permission_callback' => array( self::class, 'can_manage' ),
			)
		);
	}

	public static function can_manage(): bool {
		return current_user_can('manage_options');
	}

	public static function can_edit(): bool {
		return current_user_can('edit_posts');
	}

	public static function get_settings(): WP_REST_Response {
		return new WP_REST_Response(Settings::get(), 200);
	}

	public static function update_settings(WP_REST_Request $request): WP_REST_Response {
		$body = $request->get_json_params();
		if (! is_array($body)) {
			$body = array();
		}
		return new WP_REST_Response(Settings::update($body), 200);
	}

	public static function get_tags(): WP_REST_Response {
		return new WP_REST_Response(array( 'tags' => Registry::catalog() ), 200);
	}

	public static function preview(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$params  = $request->get_json_params();
		$post_id = absint($params['postId'] ?? 0);
		$template = (string) ($params['template'] ?? '');
		$settings = Settings::get();

		if ($post_id > 0) {
			$post = get_post($post_id);
			if (! $post) {
				return new WP_Error('kpf_seo_missing_post', 'Post not found.', array( 'status' => 404 ));
			}
			$context = Resolver::context_for_post($post, $settings);
		} else {
			$context = Resolver::base_context($settings);
			$context['title']   = $context['sitename'];
			$context['excerpt'] = $context['sitedesc'];
		}

		return new WP_REST_Response(
			array(
				'rendered' => Engine::render($template, $context),
				'context'  => $context,
			),
			200
		);
	}

	public static function resolve_post(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$post_id = absint($request['id']);
		if (! get_post($post_id)) {
			return new WP_Error('kpf_seo_missing_post', 'Post not found.', array( 'status' => 404 ));
		}

		$overrides = array();
		if ('POST' === $request->get_method()) {
			$params = $request->get_json_params();
			$params = is_array($params) ? $params : array();

			if (isset($params['seo']) && is_array($params['seo'])) {
				$overrides['seo'] = $params['seo'];
			}
			if (array_key_exists('title', $params)) {
				$overrides['title'] = sanitize_text_field((string) $params['title']);
			}
			if (array_key_exists('excerpt', $params)) {
				$overrides['excerpt'] = sanitize_textarea_field((string) $params['excerpt']);
			}
			if (array_key_exists('featured_media', $params)) {
				$overrides['featured_media'] = absint($params['featured_media']);
			}
		}

		return new WP_REST_Response(Resolver::for_post($post_id, $overrides), 200);
	}

	public static function list_redirects(): WP_REST_Response {
		return new WP_REST_Response(array( 'redirects' => RedirectRepository::all() ), 200);
	}

	public static function create_redirect(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$result = RedirectRepository::create((array) $request->get_json_params());
		if (is_wp_error($result)) {
			return $result;
		}
		return new WP_REST_Response($result, 201);
	}

	public static function update_redirect(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$result = RedirectRepository::update(absint($request['id']), (array) $request->get_json_params());
		if (is_wp_error($result)) {
			return $result;
		}
		return new WP_REST_Response($result, 200);
	}

	public static function delete_redirect(WP_REST_Request $request): WP_REST_Response {
		RedirectRepository::delete(absint($request['id']));
		return new WP_REST_Response(array( 'deleted' => true ), 200);
	}

	public static function public_redirect(WP_REST_Request $request): WP_REST_Response {
		$path = (string) $request->get_param('path');
		$match = Matcher::match($path);
		$response = new WP_REST_Response(
			array(
				'match' => $match,
			),
			200
		);
		$response->header('Cache-Control', 'public, max-age=60');
		return $response;
	}

	public static function public_robots(): WP_REST_Response {
		$settings = Settings::get();
		$response = new WP_REST_Response(
			array(
				'body' => Sitemaps::robots_txt($settings),
			),
			200
		);
		$response->header('Cache-Control', 'public, max-age=300');
		return $response;
	}

	public static function public_sitemap_index(): WP_REST_Response {
		$response = new WP_REST_Response(Sitemaps::index(), 200);
		$response->header('Cache-Control', 'public, max-age=300');
		return $response;
	}

	public static function public_sitemap_page(WP_REST_Request $request): WP_REST_Response {
		$type = sanitize_key((string) $request['type']);
		$page = absint($request['page']);
		$response = new WP_REST_Response(Sitemaps::page($type, $page), 200);
		$response->header('Cache-Control', 'public, max-age=300');
		return $response;
	}
}
