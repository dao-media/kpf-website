<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

use WP_Post;

/**
 * Global site chrome roles (header / footer) assigned to reusable components.
 */
final class Globals {
	public const ROLE_META     = '_kpf_component_global_role';
	public const BEHAVIOR_META = '_kpf_component_behavior';
	public const MAP_OPTION    = 'kpf_component_global_map';
	public const VERSION       = 1;

	public const ROLE_NONE   = 'none';
	public const ROLE_HEADER = 'header';
	public const ROLE_FOOTER = 'footer';

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
		add_action( 'enqueue_block_editor_assets', array( self::class, 'localize_editor' ), 30 );
		add_action( 'save_post_wp_block', array( self::class, 'sync_role_map' ), 20, 2 );
		add_action( 'before_delete_post', array( self::class, 'clear_deleted' ) );
		add_action( 'wp_trash_post', array( self::class, 'clear_deleted' ) );
	}

	public static function localize_editor(): void {
		if ( ! wp_script_is( Registry::SCRIPT_HANDLE, 'registered' ) ) {
			return;
		}

		wp_add_inline_script(
			Registry::SCRIPT_HANDLE,
			'window.kpfComponentGlobals = ' . wp_json_encode(
				array(
					'roleMetaKey'     => self::ROLE_META,
					'behaviorMetaKey' => self::BEHAVIOR_META,
					'canAssign'       => current_user_can( 'edit_theme_options' ),
					'defaults'        => array(
						'header' => self::default_behavior( self::ROLE_HEADER ),
						'footer' => self::default_behavior( self::ROLE_FOOTER ),
						'none'   => self::default_behavior( self::ROLE_NONE ),
					),
				)
			) . ';',
			'before'
		);
	}

	public static function register_meta(): void {
		register_post_meta(
			'wp_block',
			self::ROLE_META,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => self::ROLE_NONE,
				'show_in_rest'      => true,
				'sanitize_callback' => array( self::class, 'sanitize_role' ),
				'auth_callback'     => array( self::class, 'can_assign_role' ),
				'revisions_enabled' => true,
			)
		);

		register_post_meta(
			'wp_block',
			self::BEHAVIOR_META,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::default_behavior( self::ROLE_NONE ),
				'show_in_rest'      => array(
					'schema' => array(
						'type'                 => 'object',
						'additionalProperties' => true,
					),
				),
				'sanitize_callback' => array( self::class, 'sanitize_behavior_meta' ),
				'auth_callback'     => array( self::class, 'can_assign_role' ),
				'revisions_enabled' => true,
			)
		);
	}

	public static function can_assign_role(): bool {
		return current_user_can( 'edit_theme_options' );
	}

	/**
	 * @return list<string>
	 */
	public static function roles(): array {
		return array( self::ROLE_HEADER, self::ROLE_FOOTER );
	}

	public static function sanitize_role( $value ): string {
		$role = sanitize_key( (string) $value );
		if ( in_array( $role, self::roles(), true ) ) {
			return $role;
		}

		return self::ROLE_NONE;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function default_behavior( string $role ): array {
		$base = array( 'version' => self::VERSION );

		if ( self::ROLE_HEADER === $role ) {
			return array_merge(
				$base,
				array(
					'mode'               => 'sticky',
					'retractDelayMs'     => 180,
					'scrollThresholdPx'  => 12,
					'transitionMs'       => 280,
					'revealAtTop'        => true,
					'overlayHero'        => false,
					'transparentAtTop'   => false,
					'zIndex'             => 50,
				)
			);
		}

		if ( self::ROLE_FOOTER === $role ) {
			return array_merge(
				$base,
				array(
					'mode'      => 'inline',
					'fullWidth' => true,
				)
			);
		}

		return $base;
	}

	/**
	 * REST/meta sanitize callback — role may be embedded for concurrent saves.
	 *
	 * @param mixed $value Raw behavior object.
	 * @return array<string, mixed>
	 */
	public static function sanitize_behavior_meta( $value ): array {
		$input = is_array( $value ) ? $value : array();
		$role  = self::sanitize_role( $input['role'] ?? self::ROLE_NONE );

		if ( self::ROLE_NONE === $role ) {
			if ( isset( $input['overlayHero'] ) || isset( $input['retractDelayMs'] ) || isset( $input['transparentAtTop'] ) ) {
				$role = self::ROLE_HEADER;
			} elseif ( isset( $input['fullWidth'] ) || ( isset( $input['mode'] ) && 'sticky-bottom' === $input['mode'] ) ) {
				$role = self::ROLE_FOOTER;
			}
		}

		return self::sanitize_behavior( $input, $role );
	}

	/**
	 * @param mixed  $value Raw behavior.
	 * @param string $role  Role context.
	 * @return array<string, mixed>
	 */
	public static function sanitize_behavior( $value, string $role ): array {
		$role     = self::sanitize_role( $role );
		$defaults = self::default_behavior( $role );
		$input    = is_array( $value ) ? $value : array();

		if ( self::ROLE_HEADER === $role ) {
			$mode = sanitize_key( (string) ( $input['mode'] ?? $defaults['mode'] ) );
			if ( ! in_array( $mode, array( 'inline', 'sticky', 'sticky-hide-reveal' ), true ) ) {
				$mode = 'sticky';
			}

			return array(
				'version'            => self::VERSION,
				'mode'               => $mode,
				'retractDelayMs'     => self::clamp_int( $input['retractDelayMs'] ?? $defaults['retractDelayMs'], 0, 2000 ),
				'scrollThresholdPx'  => self::clamp_int( $input['scrollThresholdPx'] ?? $defaults['scrollThresholdPx'], 0, 200 ),
				'transitionMs'       => self::clamp_int( $input['transitionMs'] ?? $defaults['transitionMs'], 0, 2000 ),
				'revealAtTop'        => ! empty( $input['revealAtTop'] ),
				'overlayHero'        => ! empty( $input['overlayHero'] ),
				'transparentAtTop'   => ! empty( $input['transparentAtTop'] ),
				'zIndex'             => self::clamp_int( $input['zIndex'] ?? $defaults['zIndex'], 1, 9999 ),
			);
		}

		if ( self::ROLE_FOOTER === $role ) {
			$mode = sanitize_key( (string) ( $input['mode'] ?? $defaults['mode'] ) );
			if ( ! in_array( $mode, array( 'inline', 'sticky-bottom' ), true ) ) {
				$mode = 'inline';
			}

			return array(
				'version'   => self::VERSION,
				'mode'      => $mode,
				'fullWidth' => array_key_exists( 'fullWidth', $input )
					? ! empty( $input['fullWidth'] )
					: (bool) $defaults['fullWidth'],
			);
		}

		return array( 'version' => self::VERSION );
	}

	public static function get_role( int $post_id ): string {
		return self::sanitize_role( get_post_meta( $post_id, self::ROLE_META, true ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get_behavior( int $post_id, ?string $role = null ): array {
		$role = self::sanitize_role( $role ?? self::get_role( $post_id ) );
		$raw  = get_post_meta( $post_id, self::BEHAVIOR_META, true );

		return self::sanitize_behavior( $raw, $role );
	}

	/**
	 * @return array{header?: int, footer?: int}
	 */
	public static function map(): array {
		$stored = get_option( self::MAP_OPTION, array() );
		if ( ! is_array( $stored ) ) {
			return array();
		}

		$clean = array();
		foreach ( self::roles() as $role ) {
			$id = absint( $stored[ $role ] ?? 0 );
			if ( $id > 0 ) {
				$clean[ $role ] = $id;
			}
		}

		return $clean;
	}

	public static function get_published_id( string $role ): int {
		$role = self::sanitize_role( $role );
		if ( self::ROLE_NONE === $role ) {
			return 0;
		}

		$map = self::map();
		$id  = absint( $map[ $role ] ?? 0 );
		if ( $id < 1 ) {
			return 0;
		}

		$post = get_post( $id );
		if ( ! $post instanceof WP_Post || 'wp_block' !== $post->post_type || 'publish' !== $post->post_status ) {
			return 0;
		}

		if ( self::get_role( $id ) !== $role ) {
			return 0;
		}

		return $id;
	}

	/**
	 * @return array{
	 *   databaseId: int,
	 *   title: string,
	 *   role: string,
	 *   behavior: array<string, mixed>,
	 *   html: string
	 * }|null
	 */
	public static function resolve_role( string $role ): ?array {
		$id = self::get_published_id( $role );
		if ( $id < 1 ) {
			return null;
		}

		$post = get_post( $id );
		if ( ! $post instanceof WP_Post ) {
			return null;
		}

		$html = do_blocks( $post->post_content );

		return array(
			'databaseId' => $id,
			'title'      => get_the_title( $post ),
			'role'       => $role,
			'behavior'   => self::get_behavior( $id, $role ),
			'html'       => is_string( $html ) ? $html : '',
		);
	}

	/**
	 * @return array{header: ?array, footer: ?array}
	 */
	public static function site_chrome(): array {
		return array(
			'header' => self::resolve_role( self::ROLE_HEADER ),
			'footer' => self::resolve_role( self::ROLE_FOOTER ),
		);
	}

	/**
	 * Keep a single published assignment per role and refresh the option map.
	 */
	public static function sync_role_map( int $post_id, WP_Post $post ): void {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		$role = self::get_role( $post_id );
		$map  = self::map();

		if ( self::ROLE_NONE === $role || 'publish' !== $post->post_status ) {
			foreach ( $map as $mapped_role => $mapped_id ) {
				if ( (int) $mapped_id === $post_id ) {
					unset( $map[ $mapped_role ] );
				}
			}
			update_option( self::MAP_OPTION, $map, false );
			return;
		}

		$previous = absint( $map[ $role ] ?? 0 );
		if ( $previous > 0 && $previous !== $post_id ) {
			update_post_meta( $previous, self::ROLE_META, self::ROLE_NONE );
		}

		foreach ( $map as $mapped_role => $mapped_id ) {
			if ( (int) $mapped_id === $post_id && $mapped_role !== $role ) {
				unset( $map[ $mapped_role ] );
			}
		}

		$map[ $role ] = $post_id;
		update_option( self::MAP_OPTION, $map, false );

		// Ensure behavior matches the assigned role shape.
		$behavior = self::get_behavior( $post_id, $role );
		update_post_meta( $post_id, self::BEHAVIOR_META, $behavior );
	}

	public static function clear_deleted( int $post_id ): void {
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post || 'wp_block' !== $post->post_type ) {
			return;
		}

		$map = self::map();
		$changed = false;
		foreach ( $map as $role => $mapped_id ) {
			if ( (int) $mapped_id === $post_id ) {
				unset( $map[ $role ] );
				$changed = true;
			}
		}

		if ( $changed ) {
			update_option( self::MAP_OPTION, $map, false );
		}
	}

	private static function clamp_int( $value, int $min, int $max ): int {
		return max( $min, min( $max, (int) $value ) );
	}
}
