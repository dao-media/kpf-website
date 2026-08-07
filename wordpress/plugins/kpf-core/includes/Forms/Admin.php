<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

/**
 * Top-level Communications → Forms admin (visual builder).
 */
final class Admin {
	public const MENU_SLUG = 'kpf-forms';

	public static function register(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ), 9 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
		add_filter( 'kpf_design_placeholders', array( self::class, 'append_placeholders' ) );
	}

	public static function menu(): void {
		add_menu_page(
			__( 'Forms', 'kpf-core' ),
			__( 'Forms', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG,
			array( self::class, 'render' ),
			'dashicons-feedback',
			24.5
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'All Forms', 'kpf-core' ),
			__( 'All Forms', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG,
			array( self::class, 'render' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Add New', 'kpf-core' ),
			__( 'Add New', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG . '-new',
			array( self::class, 'render_new' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Settings', 'kpf-core' ),
			__( 'Settings', 'kpf-core' ),
			'edit_theme_options',
			self::MENU_SLUG . '-settings',
			array( self::class, 'render_settings' )
		);
	}

	public static function enqueue( string $hook ): void {
		$allowed = array(
			'toplevel_page_' . self::MENU_SLUG,
			'forms_page_' . self::MENU_SLUG . '-new',
		);
		if ( ! in_array( $hook, $allowed, true ) ) {
			return;
		}

		$asset_file = KPF_CORE_PATH . 'build/forms-admin.asset.php';
		$asset      = is_readable( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array( 'wp-api-fetch', 'wp-element', 'wp-i18n', 'wp-components' ),
				'version'      => KPF_CORE_VERSION,
			);

		$style_file = KPF_CORE_PATH . 'build/forms-admin.css';
		if ( is_readable( $style_file ) ) {
			wp_enqueue_style(
				'kpf-forms-admin',
				KPF_CORE_URL . 'build/forms-admin.css',
				array( 'wp-components' ),
				$asset['version']
			);
		}

		wp_enqueue_script(
			'kpf-forms-admin',
			KPF_CORE_URL . 'build/forms-admin.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_localize_script(
			'kpf-forms-admin',
			'kpfFormsAdmin',
			array(
				'restBase'    => esc_url_raw( rest_url( Rest::NAMESPACE ) ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'startNew'    => self::MENU_SLUG . '-new' === ( $_GET['page'] ?? '' ), // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				'fieldTypes'  => Catalog::field_types(),
				'conditions'  => Catalog::condition_sources(),
				'operators'   => Catalog::condition_operators(),
				'countries'   => Catalog::countries(),
				'platforms'   => Catalog::social_platforms(),
				'captchaModes' => Settings::available_captcha_modes(),
				'captcha'     => array(
					'turnstileConfigured' => Settings::turnstile_configured(),
					'recaptchaConfigured' => Settings::recaptcha_configured(),
					'choices'             => Settings::captcha_mode_choices(),
					'settingsUrl'         => admin_url( 'admin.php?page=' . self::MENU_SLUG . '-settings' ),
				),
			)
		);
	}

	public static function render(): void {
		self::render_root( false );
	}

	public static function render_new(): void {
		self::render_root( true );
	}

	public static function render_settings(): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage Forms settings.', 'kpf-core' ) );
		}

		if (
			isset( $_POST['kpf_forms_settings_nonce'] ) &&
			wp_verify_nonce(
				sanitize_text_field( wp_unslash( (string) $_POST['kpf_forms_settings_nonce'] ) ),
				'kpf_forms_settings'
			)
		) {
			$raw = isset( $_POST[ Settings::OPTION_KEY ] ) && is_array( $_POST[ Settings::OPTION_KEY ] )
				? wp_unslash( $_POST[ Settings::OPTION_KEY ] ) // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
				: array();
			$clean = Settings::sanitize( $raw );
			update_option( Settings::OPTION_KEY, $clean, false );
			echo '<div class="notice notice-success is-dismissible"><p>' .
				esc_html__( 'Forms settings saved.', 'kpf-core' ) .
				'</p></div>';
		}

		$settings  = Settings::all();
		$turnstile = $settings['turnstile'];
		$recaptcha = $settings['recaptcha'];

		echo '<div class="wrap kpf-forms-settings">';
		echo '<h1>' . esc_html__( 'Forms settings', 'kpf-core' ) . '</h1>';
		echo '<p>' . esc_html__(
			'Store captcha provider keys once. Each form can then choose any provider you have configured (plus honeypot or off). Site keys are public; secret keys stay on the server.',
			'kpf-core'
		) . '</p>';

		echo '<form method="post">';
		wp_nonce_field( 'kpf_forms_settings', 'kpf_forms_settings_nonce' );

		echo '<h2>' . esc_html__( 'Cloudflare Turnstile', 'kpf-core' ) . '</h2>';
		echo '<p class="description">' . esc_html__(
			'Create a widget at Cloudflare Turnstile, then paste the site and secret keys here. Forms can select Turnstile once both keys are saved.',
			'kpf-core'
		) . ' <a href="https://developers.cloudflare.com/turnstile/" target="_blank" rel="noopener noreferrer">' .
			esc_html__( 'Turnstile docs', 'kpf-core' ) . '</a></p>';
		echo '<table class="form-table" role="presentation"><tbody>';
		self::settings_text_row(
			'turnstile][site_key',
			__( 'Turnstile site key', 'kpf-core' ),
			(string) $turnstile['site_key'],
			__( 'Public key loaded by the frontend widget.', 'kpf-core' )
		);
		self::settings_text_row(
			'turnstile][secret_key',
			__( 'Turnstile secret key', 'kpf-core' ),
			(string) $turnstile['secret_key'],
			__( 'Private key used to verify tokens on submit. Never exposed to the browser.', 'kpf-core' ),
			'password'
		);
		echo '</tbody></table>';

		echo '<h2>' . esc_html__( 'Google reCAPTCHA', 'kpf-core' ) . '</h2>';
		echo '<p class="description">' . esc_html__(
			'Create a reCAPTCHA key pair in Google’s admin console, then paste the keys here. Choose v2 (checkbox) or v3 (score) to match the keys you created.',
			'kpf-core'
		) . ' <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noopener noreferrer">' .
			esc_html__( 'reCAPTCHA admin', 'kpf-core' ) . '</a></p>';
		echo '<table class="form-table" role="presentation"><tbody>';
		self::settings_text_row(
			'recaptcha][site_key',
			__( 'reCAPTCHA site key', 'kpf-core' ),
			(string) $recaptcha['site_key'],
			__( 'Public key for the reCAPTCHA widget.', 'kpf-core' )
		);
		self::settings_text_row(
			'recaptcha][secret_key',
			__( 'reCAPTCHA secret key', 'kpf-core' ),
			(string) $recaptcha['secret_key'],
			__( 'Private verification key. Kept server-side only.', 'kpf-core' ),
			'password'
		);

		echo '<tr><th scope="row"><label for="kpf-forms-recaptcha-version">' .
			esc_html__( 'reCAPTCHA version', 'kpf-core' ) .
			'</label></th><td>';
		echo '<select id="kpf-forms-recaptcha-version" name="' .
			esc_attr( Settings::OPTION_KEY ) . '[recaptcha][version]">';
		echo '<option value="v2"' . selected( (string) ( $recaptcha['version'] ?? 'v2' ), 'v2', false ) . '>' .
			esc_html__( 'v2 Checkbox', 'kpf-core' ) . '</option>';
		echo '<option value="v3"' . selected( (string) ( $recaptcha['version'] ?? 'v2' ), 'v3', false ) . '>' .
			esc_html__( 'v3 Score', 'kpf-core' ) . '</option>';
		echo '</select>';
		echo '<p class="description">' . esc_html__(
			'Must match the key type in Google reCAPTCHA admin.',
			'kpf-core'
		) . '</p></td></tr>';

		self::settings_text_row(
			'recaptcha][min_score',
			__( 'v3 minimum score', 'kpf-core' ),
			(string) ( $recaptcha['min_score'] ?? '0.5' ),
			__( 'Only used for v3. Google scores range from 0.0 (bot) to 1.0 (human). Default 0.5.', 'kpf-core' ),
			'number'
		);
		echo '</tbody></table>';

		$available = Settings::available_captcha_modes();
		$labels    = Catalog::captcha_mode_labels();
		echo '<h2>' . esc_html__( 'Available on forms', 'kpf-core' ) . '</h2>';
		echo '<ul>';
		foreach ( Catalog::captcha_modes() as $mode ) {
			$ready = in_array( $mode, $available, true );
			echo '<li><strong>' . esc_html( $labels[ $mode ] ?? $mode ) . '</strong> — ';
			echo $ready
				? esc_html__( 'selectable', 'kpf-core' )
				: esc_html__( 'add keys above to unlock', 'kpf-core' );
			echo '</li>';
		}
		echo '</ul>';

		submit_button( __( 'Save Forms settings', 'kpf-core' ) );
		echo '</form></div>';
	}

	private static function settings_text_row(
		string $key_path,
		string $label,
		string $value,
		string $help,
		string $type = 'text'
	): void {
		$id   = 'kpf-forms-' . sanitize_html_class( str_replace( array( '][', ']' ), array( '-', '' ), $key_path ) );
		$name = Settings::OPTION_KEY . '[' . $key_path . ']';
		echo '<tr><th scope="row"><label for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label></th><td>';
		echo '<input class="regular-text" type="' . esc_attr( $type ) . '" id="' . esc_attr( $id ) .
			'" name="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '" autocomplete="off" />';
		echo '<p class="description">' . esc_html( $help ) . '</p></td></tr>';
	}

	private static function render_root( bool $start_new ): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage forms.', 'kpf-core' ) );
		}

		echo '<div class="wrap kpf-forms-admin" data-start-new="' . ( $start_new ? '1' : '0' ) . '">';
		echo '<h1>' . esc_html__( 'Forms', 'kpf-core' ) . '</h1>';
		echo '<p class="kpf-forms-intro">' . esc_html__(
			'Build visual forms with columns, conditional logic, and analytics tags. Submissions land in Inbox → Forms. Embed with {{form:slug}}.',
			'kpf-core'
		) . '</p>';
		echo '<div id="kpf-forms-admin-root"></div>';
		echo '</div>';
	}

	/**
	 * @param array<int, array<string, mixed>> $items
	 * @return array<int, array<string, mixed>>
	 */
	public static function append_placeholders( array $items ): array {
		$items[] = array(
			'token'       => '{{form:slug}}',
			'label'       => __( 'Form embed', 'kpf-core' ),
			'description' => __( 'Replace “slug” with a saved form slug.', 'kpf-core' ),
			'group'       => 'forms',
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
				'token'       => sprintf( '{{form:%s}}', $post->post_name ),
				'label'       => sprintf( __( 'Form: %s', 'kpf-core' ), get_the_title( $post ) ),
				'description' => sprintf( __( 'Embed the “%s” form.', 'kpf-core' ), $post->post_name ),
				'group'       => 'forms',
			);
		}

		return $items;
	}
}
