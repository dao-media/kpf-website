<?php

declare(strict_types=1);

namespace KPF\Core\Queries;

/**
 * Admin screen under Code → Queries.
 */
final class Admin {
	public const MENU_SLUG = 'kpf-queries';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 20 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
		add_filter( 'kpf_design_placeholders', array( self::class, 'append_placeholders' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			'edit.php?post_type=kpf_code',
			__( 'Queries', 'kpf-core' ),
			__( 'Queries', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG,
			array( self::class, 'render' )
		);
	}

	public static function enqueue( string $hook ): void {
		if ( 'kpf_code_page_' . self::MENU_SLUG !== $hook ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/queries-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-element', 'wp-i18n', 'wp-components' ),
				'version'      => KPF_CORE_VERSION,
			);

		$style_file = KPF_CORE_PATH . 'build/queries-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-queries-admin',
				KPF_CORE_URL . 'build/queries-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-queries-admin',
			KPF_CORE_URL . 'build/queries-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-queries-admin',
			'kpfQueriesAdmin',
			array(
				'restBase' => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
			)
		);
	}

	public static function render(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage queries.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-queries-admin">';
		echo '<h1>' . esc_html__( 'Queries', 'kpf-core' ) . '</h1>';
		echo '<p class="kpf-queries-intro">' . esc_html__(
			'Build reusable content queries and loop over them in page designs with {{#each queries.slug}}.',
			'kpf-core'
		) . '</p>';
		echo '<div id="kpf-queries-admin-root"></div>';
		echo '</div>';
	}

	/**
	 * @param array<int, array<string, mixed>> $items Placeholder catalog.
	 * @return array<int, array<string, mixed>>
	 */
	public static function append_placeholders( array $items ): array {
		$items[] = array(
			'token'       => '{{#each queries.slug}}…{{/each}}',
			'label'       => __( 'Query loop', 'kpf-core' ),
			'description' => __( 'Replace “slug” with a saved query slug. Inside the loop use {{title}}, {{link}}, {{excerpt}}, {{featuredImage.url}}.', 'kpf-core' ),
			'group'       => 'queries',
		);
		$items[] = array(
			'token'       => '{{#if title}}…{{else}}…{{/if}}',
			'label'       => __( 'Conditional block', 'kpf-core' ),
			'description' => __( 'Show content when a field is truthy. Works inside and outside query loops.', 'kpf-core' ),
			'group'       => 'queries',
		);

		$posts = get_posts(
			array(
				'post_type'      => ContentType::POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => 50,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		foreach ( $posts as $post ) {
			$items[] = array(
				'token'       => sprintf( '{{#each queries.%s}}…{{/each}}', $post->post_name ),
				'label'       => sprintf( __( 'Query: %s', 'kpf-core' ), get_the_title( $post ) ),
				'description' => sprintf( __( 'Loop over the “%s” query.', 'kpf-core' ), $post->post_name ),
				'group'       => 'queries',
			);
		}

		return $items;
	}
}
