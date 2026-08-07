<?php

declare(strict_types=1);

namespace KPF\Core\Forms;

/**
 * Allowlisted field types, condition sources, and reference data for the Forms builder.
 */
final class Catalog {
	/**
	 * @return array<int, array{id:string,label:string,group:string,defaultWidth:string}>
	 */
	public static function field_types(): array {
		return array(
			array( 'id' => 'short_text', 'label' => 'Short text', 'group' => 'inputs', 'defaultWidth' => 'half' ),
			array( 'id' => 'long_text', 'label' => 'Long text', 'group' => 'inputs', 'defaultWidth' => 'full' ),
			array( 'id' => 'email', 'label' => 'Email', 'group' => 'inputs', 'defaultWidth' => 'half' ),
			array( 'id' => 'tel', 'label' => 'Telephone', 'group' => 'inputs', 'defaultWidth' => 'half' ),
			array( 'id' => 'number', 'label' => 'Number', 'group' => 'inputs', 'defaultWidth' => 'half' ),
			array( 'id' => 'url', 'label' => 'URL / link', 'group' => 'inputs', 'defaultWidth' => 'half' ),
			array( 'id' => 'password', 'label' => 'Password', 'group' => 'inputs', 'defaultWidth' => 'half' ),
			array( 'id' => 'hidden', 'label' => 'Hidden', 'group' => 'inputs', 'defaultWidth' => 'full' ),
			array( 'id' => 'select', 'label' => 'Dropdown', 'group' => 'choice', 'defaultWidth' => 'half' ),
			array( 'id' => 'multiselect', 'label' => 'Multi-select', 'group' => 'choice', 'defaultWidth' => 'full' ),
			array( 'id' => 'radio', 'label' => 'Multiple choice', 'group' => 'choice', 'defaultWidth' => 'full' ),
			array( 'id' => 'checkbox', 'label' => 'Checkbox', 'group' => 'choice', 'defaultWidth' => 'full' ),
			array( 'id' => 'checkbox_group', 'label' => 'Checkbox group', 'group' => 'choice', 'defaultWidth' => 'full' ),
			array( 'id' => 'toggle', 'label' => 'Toggle', 'group' => 'choice', 'defaultWidth' => 'half' ),
			array( 'id' => 'ranking', 'label' => 'Ranking', 'group' => 'choice', 'defaultWidth' => 'full' ),
			array( 'id' => 'date', 'label' => 'Date', 'group' => 'pickers', 'defaultWidth' => 'half' ),
			array( 'id' => 'time', 'label' => 'Time', 'group' => 'pickers', 'defaultWidth' => 'half' ),
			array( 'id' => 'datetime', 'label' => 'Date & time', 'group' => 'pickers', 'defaultWidth' => 'half' ),
			array( 'id' => 'city_state', 'label' => 'City + state', 'group' => 'special', 'defaultWidth' => 'full' ),
			array( 'id' => 'file', 'label' => 'File upload', 'group' => 'special', 'defaultWidth' => 'full' ),
			array( 'id' => 'social', 'label' => 'Social profile', 'group' => 'special', 'defaultWidth' => 'half' ),
			array( 'id' => 'html', 'label' => 'Content block', 'group' => 'special', 'defaultWidth' => 'full' ),
			array( 'id' => 'divider', 'label' => 'Divider', 'group' => 'special', 'defaultWidth' => 'full' ),
			array( 'id' => 'captcha', 'label' => 'Captcha', 'group' => 'special', 'defaultWidth' => 'full' ),
		);
	}

	/**
	 * @return list<string>
	 */
	public static function field_type_ids(): array {
		return array_values(
			array_map(
				static fn( array $row ): string => $row['id'],
				self::field_types()
			)
		);
	}

	/**
	 * @return array<int, array{id:string,label:string}>
	 */
	public static function condition_sources(): array {
		return array(
			array( 'id' => 'field', 'label' => 'Field value' ),
			array( 'id' => 'path', 'label' => 'Current path' ),
			array( 'id' => 'history', 'label' => 'Session page history' ),
			array( 'id' => 'referrer', 'label' => 'Referral source' ),
			array( 'id' => 'utm', 'label' => 'UTM parameter' ),
			array( 'id' => 'query', 'label' => 'URL query param' ),
			array( 'id' => 'auth', 'label' => 'Authentication' ),
			array( 'id' => 'schedule', 'label' => 'Schedule' ),
		);
	}

	/**
	 * @return list<string>
	 */
	public static function condition_operators(): array {
		return array(
			'equals',
			'not_equals',
			'contains',
			'not_contains',
			'empty',
			'not_empty',
			'checked',
			'unchecked',
			'matches',
			'after',
			'before',
			'includes',
		);
	}

	/**
	 * @return array<int, array{code:string,dial:string,label:string,example:string}>
	 */
	public static function countries(): array {
		return array(
			array( 'code' => 'US', 'dial' => '1', 'label' => 'United States', 'example' => '(555) 123-4567' ),
			array( 'code' => 'CA', 'dial' => '1', 'label' => 'Canada', 'example' => '(555) 123-4567' ),
			array( 'code' => 'GB', 'dial' => '44', 'label' => 'United Kingdom', 'example' => '07123 456789' ),
			array( 'code' => 'AU', 'dial' => '61', 'label' => 'Australia', 'example' => '0412 345 678' ),
			array( 'code' => 'IE', 'dial' => '353', 'label' => 'Ireland', 'example' => '085 123 4567' ),
			array( 'code' => 'DE', 'dial' => '49', 'label' => 'Germany', 'example' => '0151 23456789' ),
			array( 'code' => 'FR', 'dial' => '33', 'label' => 'France', 'example' => '06 12 34 56 78' ),
			array( 'code' => 'MX', 'dial' => '52', 'label' => 'Mexico', 'example' => '55 1234 5678' ),
			array( 'code' => 'IN', 'dial' => '91', 'label' => 'India', 'example' => '98765 43210' ),
			array( 'code' => 'BR', 'dial' => '55', 'label' => 'Brazil', 'example' => '(11) 91234-5678' ),
			array( 'code' => 'NZ', 'dial' => '64', 'label' => 'New Zealand', 'example' => '021 123 4567' ),
			array( 'code' => 'PH', 'dial' => '63', 'label' => 'Philippines', 'example' => '0917 123 4567' ),
		);
	}

	/**
	 * @return list<string>
	 */
	public static function social_platforms(): array {
		return array( 'x', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'github', 'other' );
	}

	/**
	 * @return list<string>
	 */
	public static function captcha_modes(): array {
		return array( 'honeypot', 'turnstile', 'recaptcha', 'off' );
	}

	/**
	 * @return array<string, string>
	 */
	public static function captcha_mode_labels(): array {
		return array(
			'honeypot'  => __( 'Honeypot (no keys)', 'kpf-core' ),
			'turnstile' => __( 'Cloudflare Turnstile', 'kpf-core' ),
			'recaptcha' => __( 'Google reCAPTCHA', 'kpf-core' ),
			'off'       => __( 'Off', 'kpf-core' ),
		);
	}
}
