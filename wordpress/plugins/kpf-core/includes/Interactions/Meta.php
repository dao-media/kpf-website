<?php

declare(strict_types=1);

namespace KPF\Core\Interactions;

final class Meta {
	public const META_KEY      = '_kpf_gsap_animation';
	public const VERSION       = 1;
	public const MAX_KEYFRAMES = 12;

	private const PROPERTIES = array(
		'x',
		'y',
		'xPercent',
		'yPercent',
		'scale',
		'scaleX',
		'scaleY',
		'rotation',
		'rotationX',
		'rotationY',
		'skewX',
		'skewY',
		'opacity',
		'autoAlpha',
		'backgroundColor',
		'color',
		'borderRadius',
		'transformOrigin',
	);

	public static function register(): void {
		add_action( 'init', array( self::class, 'register_meta' ), 10 );
	}

	public static function register_meta(): void {
		register_post_meta(
			ContentType::POST_TYPE,
			self::META_KEY,
			array(
				'type'              => 'object',
				'single'            => true,
				'default'           => self::defaults(),
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'auth_callback'     => static fn(): bool => current_user_can( 'edit_pages' ),
				'revisions_enabled' => true,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'version'      => self::VERSION,
			'active'       => true,
			'selector'     => '',
			'trigger'      => 'load',
			'method'       => 'from',
			'duration'     => 0.8,
			'delay'        => 0,
			'ease'         => 'power2.out',
			'customBezier' => '0.25,0.1,0.25,1',
			'stagger'      => 0,
			'repeat'       => 0,
			'yoyo'         => false,
			'from'         => array( 'y' => 28, 'autoAlpha' => 0 ),
			'to'           => array( 'y' => 0, 'autoAlpha' => 1 ),
			'keyframes'    => array(),
			'svg'          => array(
				'effect'          => 'none',
				'drawFrom'        => '0% 0%',
				'drawTo'          => '0% 100%',
				'morphTarget'     => '',
				'pathSelector'    => '',
				'autoRotate'      => false,
				'transformOrigin' => '50% 50%',
			),
			'scroll'       => array(
				'start' => 'top 85%',
				'end'   => 'bottom 20%',
				'scrub' => 0,
				'once'  => true,
			),
		);
	}

	/**
	 * @param mixed $value Raw animation data.
	 * @return array<string, mixed>
	 */
	public static function sanitize( $value ): array {
		$value    = is_array( $value ) ? $value : array();
		$defaults = self::defaults();
		$selector = substr( sanitize_text_field( (string) ( $value['selector'] ?? '' ) ), 0, 200 );
		if ( preg_match( '/[{};<>\x00-\x1F]/', $selector ) ) {
			$selector = '';
		}

		$trigger = (string) ( $value['trigger'] ?? 'load' );
		if ( ! in_array( $trigger, array( 'load', 'in-view', 'hover', 'click' ), true ) ) {
			$trigger = 'load';
		}

		$method = (string) ( $value['method'] ?? 'from' );
		if ( ! in_array( $method, array( 'to', 'from', 'fromTo', 'keyframes' ), true ) ) {
			$method = 'from';
		}

		$ease = substr( sanitize_text_field( (string) ( $value['ease'] ?? 'power2.out' ) ), 0, 80 );
		if ( ! preg_match( '/^[a-zA-Z0-9_.(),\-\s]+$/', $ease ) ) {
			$ease = 'power2.out';
		}

		$bezier = sanitize_text_field( (string) ( $value['customBezier'] ?? $defaults['customBezier'] ) );
		if ( ! preg_match( '/^-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+$/', $bezier ) ) {
			$bezier = (string) $defaults['customBezier'];
		}

		$keyframes = array();
		foreach ( array_slice( is_array( $value['keyframes'] ?? null ) ? $value['keyframes'] : array(), 0, self::MAX_KEYFRAMES ) as $frame ) {
			if ( ! is_array( $frame ) ) {
				continue;
			}
			$keyframes[] = array(
				'duration' => self::number( $frame['duration'] ?? 0.5, 0.01, 20 ),
				'ease'     => substr( sanitize_text_field( (string) ( $frame['ease'] ?? 'power1.out' ) ), 0, 80 ),
				'props'    => self::sanitize_properties( $frame['props'] ?? array() ),
			);
		}

		$scroll = is_array( $value['scroll'] ?? null ) ? $value['scroll'] : array();
		$svg    = is_array( $value['svg'] ?? null ) ? $value['svg'] : array();
		$effect = (string) ( $svg['effect'] ?? 'none' );
		if ( ! in_array( $effect, array( 'none', 'draw', 'morph', 'motionPath' ), true ) ) {
			$effect = 'none';
		}

		return array(
			'version'      => self::VERSION,
			'active'       => (bool) ( $value['active'] ?? true ),
			'selector'     => $selector,
			'trigger'      => $trigger,
			'method'       => $method,
			'duration'     => self::number( $value['duration'] ?? 0.8, 0.01, 60 ),
			'delay'        => self::number( $value['delay'] ?? 0, 0, 60 ),
			'ease'         => $ease,
			'customBezier' => $bezier,
			'stagger'      => self::number( $value['stagger'] ?? 0, 0, 10 ),
			'repeat'       => max( -1, min( 20, (int) ( $value['repeat'] ?? 0 ) ) ),
			'yoyo'         => (bool) ( $value['yoyo'] ?? false ),
			'from'         => self::sanitize_properties( $value['from'] ?? array() ),
			'to'           => self::sanitize_properties( $value['to'] ?? array() ),
			'keyframes'    => $keyframes,
			'svg'          => array(
				'effect'          => $effect,
				'drawFrom'        => self::svg_value( $svg['drawFrom'] ?? '0% 0%' ),
				'drawTo'          => self::svg_value( $svg['drawTo'] ?? '0% 100%' ),
				'morphTarget'     => self::selector( $svg['morphTarget'] ?? '' ),
				'pathSelector'    => self::selector( $svg['pathSelector'] ?? '' ),
				'autoRotate'      => (bool) ( $svg['autoRotate'] ?? false ),
				'transformOrigin' => substr( sanitize_text_field( (string) ( $svg['transformOrigin'] ?? '50% 50%' ) ), 0, 40 ),
			),
			'scroll'       => array(
				'start' => substr( sanitize_text_field( (string) ( $scroll['start'] ?? 'top 85%' ) ), 0, 80 ),
				'end'   => substr( sanitize_text_field( (string) ( $scroll['end'] ?? 'bottom 20%' ) ), 0, 80 ),
				'scrub' => self::number( $scroll['scrub'] ?? 0, 0, 10 ),
				'once'  => (bool) ( $scroll['once'] ?? true ),
			),
		);
	}

	/**
	 * @param mixed $value Raw properties.
	 * @return array<string, int|float|string>
	 */
	public static function sanitize_properties( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$clean = array();
		foreach ( self::PROPERTIES as $property ) {
			if ( ! array_key_exists( $property, $value ) || '' === $value[ $property ] ) {
				continue;
			}
			$raw = $value[ $property ];
			if ( is_numeric( $raw ) ) {
				$clean[ $property ] = (float) $raw;
				continue;
			}
			$text = substr( sanitize_text_field( (string) $raw ), 0, 80 );
			if ( preg_match( '/^[a-zA-Z0-9#.,%()+\-=\s]+$/', $text ) ) {
				$clean[ $property ] = $text;
			}
		}
		return $clean;
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function get( int $post_id ): array {
		$value = get_post_meta( $post_id, self::META_KEY, true );
		return self::sanitize( is_array( $value ) ? $value : array() );
	}

	private static function number( $value, float $minimum, float $maximum ): float {
		return max( $minimum, min( $maximum, (float) $value ) );
	}

	private static function selector( $value ): string {
		$selector = substr( sanitize_text_field( (string) $value ), 0, 200 );
		return preg_match( '/[{};<>\x00-\x1F]/', $selector ) ? '' : $selector;
	}

	private static function svg_value( $value ): string {
		$value = substr( sanitize_text_field( (string) $value ), 0, 40 );
		return preg_match( '/^[0-9.%\s-]+$/', $value ) ? $value : '';
	}
}
