<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

/**
 * Global Forms settings (captcha provider keys shared across builder forms).
 */
final class Settings {
	public const OPTION_KEY = 'kpf_forms_settings';
	public const VERSION    = 1;

	public static function register(): void {
		add_action(
			'admin_init',
			static function (): void {
				register_setting(
					'kpf_forms',
					self::OPTION_KEY,
					array(
						'type'              => 'object',
						'default'           => self::defaults(),
						'sanitize_callback' => array( self::class, 'sanitize' ),
						'show_in_rest'      => false,
					)
				);
			}
		);
	}

	public static function ensure_defaults(): void {
		$current = get_option( self::OPTION_KEY, null );
		if ( ! is_array( $current ) ) {
			update_option( self::OPTION_KEY, self::defaults(), false );
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'   => self::VERSION,
			'turnstile' => array(
				'site_key'   => '',
				'secret_key' => '',
			),
			'recaptcha' => array(
				'site_key'   => '',
				'secret_key' => '',
				'version'    => 'v2',
				'min_score'  => 0.5,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function all(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return array_replace_recursive( self::defaults(), $stored );
	}

	/**
	 * @param mixed $value
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value     = is_array( $value ) ? $value : array();
		$turnstile = is_array( $value['turnstile'] ?? null ) ? $value['turnstile'] : array();
		$recaptcha = is_array( $value['recaptcha'] ?? null ) ? $value['recaptcha'] : array();

		$version = sanitize_key( (string) ( $recaptcha['version'] ?? 'v2' ) );
		if ( ! in_array( $version, array( 'v2', 'v3' ), true ) ) {
			$version = 'v2';
		}

		$min_score = (float) ( $recaptcha['min_score'] ?? 0.5 );
		$min_score = max( 0.0, min( 1.0, $min_score ) );

		return array(
			'version'   => self::VERSION,
			'turnstile' => array(
				'site_key'   => self::sanitize_key_value( $turnstile['site_key'] ?? '' ),
				'secret_key' => self::sanitize_key_value( $turnstile['secret_key'] ?? '' ),
			),
			'recaptcha' => array(
				'site_key'   => self::sanitize_key_value( $recaptcha['site_key'] ?? '' ),
				'secret_key' => self::sanitize_key_value( $recaptcha['secret_key'] ?? '' ),
				'version'    => $version,
				'min_score'  => $min_score,
			),
		);
	}

	private static function sanitize_key_value( $value ): string {
		return preg_replace( '/[^a-zA-Z0-9_\-.]/', '', (string) $value ) ?? '';
	}

	public static function turnstile_site_key(): string {
		return (string) ( self::all()['turnstile']['site_key'] ?? '' );
	}

	public static function turnstile_secret_key(): string {
		return (string) ( self::all()['turnstile']['secret_key'] ?? '' );
	}

	public static function recaptcha_site_key(): string {
		return (string) ( self::all()['recaptcha']['site_key'] ?? '' );
	}

	public static function recaptcha_secret_key(): string {
		return (string) ( self::all()['recaptcha']['secret_key'] ?? '' );
	}

	public static function recaptcha_version(): string {
		$version = sanitize_key( (string) ( self::all()['recaptcha']['version'] ?? 'v2' ) );
		return in_array( $version, array( 'v2', 'v3' ), true ) ? $version : 'v2';
	}

	public static function recaptcha_min_score(): float {
		return (float) ( self::all()['recaptcha']['min_score'] ?? 0.5 );
	}

	public static function turnstile_configured(): bool {
		return '' !== self::turnstile_site_key() && '' !== self::turnstile_secret_key();
	}

	public static function recaptcha_configured(): bool {
		return '' !== self::recaptcha_site_key() && '' !== self::recaptcha_secret_key();
	}

	/**
	 * Captcha modes the editor may pick, based on installed provider keys.
	 *
	 * @return list<string>
	 */
	public static function available_captcha_modes(): array {
		$available = array( 'honeypot', 'off' );
		if ( self::turnstile_configured() ) {
			$available[] = 'turnstile';
		}
		if ( self::recaptcha_configured() ) {
			$available[] = 'recaptcha';
		}

		$order = Catalog::captcha_modes();
		return array_values(
			array_filter(
				$order,
				static fn( string $mode ): bool => in_array( $mode, $available, true )
			)
		);
	}

	/**
	 * @return array<int, array{value:string,label:string,available:bool}>
	 */
	public static function captcha_mode_choices(): array {
		$available = self::available_captcha_modes();
		$labels    = Catalog::captcha_mode_labels();
		$out       = array();
		foreach ( Catalog::captcha_modes() as $mode ) {
			$out[] = array(
				'value'     => $mode,
				'label'     => $labels[ $mode ] ?? $mode,
				'available' => in_array( $mode, $available, true ),
			);
		}
		return $out;
	}

	/**
	 * Normalize a stored form mode to something currently available.
	 */
	public static function coerce_captcha_mode( string $mode ): string {
		$mode = sanitize_key( $mode );
		$available = self::available_captcha_modes();
		if ( in_array( $mode, $available, true ) ) {
			return $mode;
		}
		return 'honeypot';
	}

	/**
	 * Public captcha config safe to expose to the headless frontend (site keys only).
	 *
	 * @return array{mode:string,siteKey:string,provider:string,version:string,minScore:float}
	 */
	public static function public_for_mode( string $mode ): array {
		$mode = self::coerce_captcha_mode( $mode );

		$site_key = '';
		$provider = 'none';
		$version  = '';
		$min_score = 0.5;

		if ( 'turnstile' === $mode ) {
			$site_key = self::turnstile_site_key();
			$provider = 'turnstile';
		} elseif ( 'recaptcha' === $mode ) {
			$site_key  = self::recaptcha_site_key();
			$provider  = 'recaptcha';
			$version   = self::recaptcha_version();
			$min_score = self::recaptcha_min_score();
		}

		return array(
			'mode'     => $mode,
			'provider' => $provider,
			'siteKey'  => $site_key,
			'version'  => $version,
			'minScore' => $min_score,
		);
	}
}
