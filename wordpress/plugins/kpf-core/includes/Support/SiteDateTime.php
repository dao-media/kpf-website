<?php

declare(strict_types=1);

namespace KPF\Core\Support;

/**
 * Site-timezone date/time helpers.
 *
 * Timestamps stay absolute (UTC unix). Display always uses the current
 * WordPress timezone option, so changing Settings → General → Timezone
 * updates every formatted value on the next render.
 */
final class SiteDateTime {
	/**
	 * @return array{
	 *   timezone: string,
	 *   timezoneAbbr: string,
	 *   dateFormat: string,
	 *   timeFormat: string,
	 *   locale: string,
	 *   hour: int
	 * }
	 */
	public static function config(): array {
		$tz  = wp_timezone();
		$now = new \DateTimeImmutable( 'now', $tz );

		return array(
			'timezone'     => wp_timezone_string(),
			'timezoneAbbr' => $now->format( 'T' ),
			'dateFormat'   => (string) get_option( 'date_format' ),
			'timeFormat'   => (string) get_option( 'time_format' ),
			'locale'       => str_replace( '_', '-', determine_locale() ),
			'hour'         => (int) $now->format( 'G' ),
		);
	}

	/**
	 * Format a unix timestamp (seconds) with the site timezone.
	 */
	public static function format( int $timestamp, ?string $format = null ): string {
		if ( $timestamp <= 0 ) {
			$timestamp = time();
		}

		if ( null === $format || '' === $format ) {
			$format = trim( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ) );
		}

		if ( '' === $format ) {
			$format = 'Y-m-d H:i';
		}

		return (string) wp_date( $format, $timestamp );
	}

	/**
	 * Format date-only (no time).
	 */
	public static function format_date( int $timestamp ): string {
		$format = (string) get_option( 'date_format' );
		if ( '' === $format ) {
			$format = 'Y-m-d';
		}
		return self::format( $timestamp, $format );
	}

	/**
	 * Human label for the configured timezone.
	 */
	public static function timezone_label(): string {
		$config = self::config();
		$zone   = $config['timezone'];
		$abbr   = $config['timezoneAbbr'];
		if ( $zone && $abbr && $abbr !== $zone ) {
			return $zone . ' (' . $abbr . ')';
		}
		return $zone ?: $abbr;
	}
}
