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

	private const EFFECTS = array(
		'none',
		'draw',
		'morph',
		'motionPath',
		'splitText',
		'scrambleText',
		'text',
		'physics2D',
		'physicsProps',
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
			'version'         => self::VERSION,
			'active'          => true,
			'selector'        => '',
			'animateChild'    => '',
			'trigger'         => 'load',
			'method'          => 'from',
			'duration'        => 0.8,
			'delay'           => 0,
			'ease'            => 'power2.out',
			'customBezier'    => '0.25,0.1,0.25,1',
			'wiggleCount'     => 10,
			'wiggleType'      => 'easeOut',
			'bounceStrength'  => 0.7,
			'bounceSquash'    => 1.5,
			'stagger'         => 0,
			'repeat'          => 0,
			'yoyo'            => false,
			'from'            => array( 'y' => 28, 'autoAlpha' => 0 ),
			'to'              => array( 'y' => 0, 'autoAlpha' => 1 ),
			'keyframes'       => array(),
			'svg'             => self::effect_defaults(),
			'scroll'          => array(
				'start' => 'top 85%',
				'end'   => 'bottom 20%',
				'scrub' => 0,
				'once'  => true,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function effect_defaults(): array {
		return array(
			'effect'           => 'none',
			'drawFrom'         => '0% 0%',
			'drawTo'           => '0% 100%',
			'morphTarget'      => '',
			'pathSelector'     => '',
			'autoRotate'       => false,
			'transformOrigin'  => '50% 50%',
			'splitType'        => 'chars,words,lines',
			'splitAnimate'     => 'chars',
			'scrambleText'     => '',
			'scrambleChars'    => 'upperCase',
			'scrambleSpeed'    => 0.3,
			'textValue'        => '',
			'textDelimiter'    => '',
			'physicsVelocity'  => 200,
			'physicsAngle'     => -90,
			'physicsGravity'   => 500,
			'physicsFriction'  => 0.1,
			'physicsProps'     => array(
				'x' => array( 'acceleration' => 0, 'friction' => 0.1, 'velocity' => 0 ),
				'y' => array( 'acceleration' => 500, 'friction' => 0.1, 'velocity' => -200 ),
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
		$animate_child = self::selector( $value['animateChild'] ?? '' );

		$trigger = (string) ( $value['trigger'] ?? 'load' );
		if ( ! in_array( $trigger, array( 'load', 'in-view', 'hover', 'click' ), true ) ) {
			$trigger = 'load';
		}

		$method = (string) ( $value['method'] ?? 'from' );
		if ( ! in_array( $method, array( 'to', 'from', 'fromTo', 'keyframes' ), true ) ) {
			$method = 'from';
		}

		$ease = substr( sanitize_text_field( (string) ( $value['ease'] ?? 'power2.out' ) ), 0, 120 );
		if ( ! preg_match( '/^[a-zA-Z0-9_.(),:{}\-\s]+$/', $ease ) ) {
			$ease = 'power2.out';
		}

		$bezier = sanitize_text_field( (string) ( $value['customBezier'] ?? $defaults['customBezier'] ) );
		if ( ! preg_match( '/^-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+$/', $bezier ) ) {
			$bezier = (string) $defaults['customBezier'];
		}

		$wiggle_type = sanitize_key( (string) ( $value['wiggleType'] ?? 'easeOut' ) );
		if ( ! in_array( $wiggle_type, array( 'easeOut', 'easeInOut', 'anticipate', 'uniform' ), true ) ) {
			$wiggle_type = 'easeOut';
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
		if ( ! in_array( $effect, self::EFFECTS, true ) ) {
			$effect = 'none';
		}

		$split_animate = sanitize_key( (string) ( $svg['splitAnimate'] ?? 'chars' ) );
		if ( ! in_array( $split_animate, array( 'chars', 'words', 'lines' ), true ) ) {
			$split_animate = 'chars';
		}

		$scramble_chars = sanitize_text_field( (string) ( $svg['scrambleChars'] ?? 'upperCase' ) );
		if ( ! in_array( $scramble_chars, array( 'upperCase', 'lowerCase', 'upperAndLowerCase', 'numbers' ), true ) ) {
			$scramble_chars = substr( preg_replace( '/[^a-zA-Z0-9\s]/', '', $scramble_chars ) ?? 'upperCase', 0, 80 );
			if ( '' === $scramble_chars ) {
				$scramble_chars = 'upperCase';
			}
		}

		return array(
			'version'        => self::VERSION,
			'active'         => (bool) ( $value['active'] ?? true ),
			'selector'       => $selector,
			'animateChild'   => $animate_child,
			'trigger'        => $trigger,
			'method'         => $method,
			'duration'       => self::number( $value['duration'] ?? 0.8, 0.01, 60 ),
			'delay'          => self::number( $value['delay'] ?? 0, 0, 60 ),
			'ease'           => $ease,
			'customBezier'   => $bezier,
			'wiggleCount'    => max( 1, min( 50, (int) ( $value['wiggleCount'] ?? 10 ) ) ),
			'wiggleType'     => $wiggle_type,
			'bounceStrength' => self::number( $value['bounceStrength'] ?? 0.7, 0.1, 2 ),
			'bounceSquash'   => self::number( $value['bounceSquash'] ?? 1.5, 0, 4 ),
			'stagger'        => self::number( $value['stagger'] ?? 0, 0, 10 ),
			'repeat'         => max( -1, min( 20, (int) ( $value['repeat'] ?? 0 ) ) ),
			'yoyo'           => (bool) ( $value['yoyo'] ?? false ),
			'from'           => self::sanitize_properties( $value['from'] ?? array() ),
			'to'             => self::sanitize_properties( $value['to'] ?? array() ),
			'keyframes'      => $keyframes,
			'svg'            => array(
				'effect'          => $effect,
				'drawFrom'        => self::svg_value( $svg['drawFrom'] ?? '0% 0%' ),
				'drawTo'          => self::svg_value( $svg['drawTo'] ?? '0% 100%' ),
				'morphTarget'     => self::selector( $svg['morphTarget'] ?? '' ),
				'pathSelector'    => self::selector( $svg['pathSelector'] ?? '' ),
				'autoRotate'      => (bool) ( $svg['autoRotate'] ?? false ),
				'transformOrigin' => substr( sanitize_text_field( (string) ( $svg['transformOrigin'] ?? '50% 50%' ) ), 0, 40 ),
				'splitType'       => self::split_type( $svg['splitType'] ?? 'chars,words,lines' ),
				'splitAnimate'    => $split_animate,
				'scrambleText'    => substr( sanitize_text_field( (string) ( $svg['scrambleText'] ?? '' ) ), 0, 200 ),
				'scrambleChars'   => $scramble_chars,
				'scrambleSpeed'   => self::number( $svg['scrambleSpeed'] ?? 0.3, 0.01, 5 ),
				'textValue'       => substr( sanitize_text_field( (string) ( $svg['textValue'] ?? '' ) ), 0, 200 ),
				'textDelimiter'   => substr( sanitize_text_field( (string) ( $svg['textDelimiter'] ?? '' ) ), 0, 20 ),
				'physicsVelocity' => self::number( $svg['physicsVelocity'] ?? 200, -2000, 2000 ),
				'physicsAngle'    => self::number( $svg['physicsAngle'] ?? -90, -360, 360 ),
				'physicsGravity'  => self::number( $svg['physicsGravity'] ?? 500, -2000, 2000 ),
				'physicsFriction' => self::number( $svg['physicsFriction'] ?? 0.1, 0, 1 ),
				'physicsProps'    => self::sanitize_physics_props( $svg['physicsProps'] ?? array() ),
			),
			'scroll'         => array(
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

	private static function split_type( $value ): string {
		$parts = array_filter(
			array_map(
				static fn( string $part ): string => sanitize_key( trim( $part ) ),
				explode( ',', (string) $value )
			)
		);
		$allowed = array( 'chars', 'words', 'lines' );
		$clean   = array_values( array_intersect( $parts, $allowed ) );
		return $clean ? implode( ',', $clean ) : 'chars,words,lines';
	}

	/**
	 * @param mixed $value
	 * @return array<string, array<string, float>>
	 */
	private static function sanitize_physics_props( $value ): array {
		$value = is_array( $value ) ? $value : array();
		$out   = array();
		foreach ( array( 'x', 'y', 'rotation', 'scale' ) as $axis ) {
			$row = is_array( $value[ $axis ] ?? null ) ? $value[ $axis ] : array();
			$out[ $axis ] = array(
				'acceleration' => self::number( $row['acceleration'] ?? 0, -5000, 5000 ),
				'friction'     => self::number( $row['friction'] ?? 0.1, 0, 1 ),
				'velocity'     => self::number( $row['velocity'] ?? 0, -5000, 5000 ),
			);
		}
		return $out;
	}
}
