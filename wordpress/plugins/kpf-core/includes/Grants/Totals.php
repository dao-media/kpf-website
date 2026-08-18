<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

/**
 * Aggregated grant totals for copy, SEO tags, and design placeholders.
 *
 * Invocations:
 * - SEO: %%grants_total%%
 * - Design: {{grants.total}}
 * - GraphQL: kpfGrantsTotal { amount, label }
 */
final class Totals {
	public const TRANSIENT_KEY = 'kpf_grants_total_amount_v1';

	public static function register(): void {
		add_action( 'kpf_seo_register_tags', array( self::class, 'register_seo_tags' ) );
		add_filter( 'kpf_design_placeholders', array( self::class, 'append_design_placeholders' ) );
		add_action( 'save_post_' . ContentType::POST_TYPE, array( self::class, 'bust_cache' ) );
		add_action( 'deleted_post', array( self::class, 'bust_cache_on_delete' ) );
		add_action( 'trashed_post', array( self::class, 'bust_cache_on_delete' ) );
		add_action( 'untrashed_post', array( self::class, 'bust_cache_on_delete' ) );
	}

	/**
	 * @param callable $register function(string $token, array $definition): void
	 */
	public static function register_seo_tags( callable $register ): void {
		$register(
			'grants_total',
			array(
				'label'       => __( 'Total KPF grants', 'kpf-core' ),
				'description' => __( 'Formatted sum of published grant amounts (e.g. $50,000).', 'kpf-core' ),
				'group'       => 'Foundation',
				'example'     => '%%grants_total%%',
				'callback'    => static fn(): string => self::label(),
			)
		);
	}

	/**
	 * @param array<int, array{token: string, label: string, description: string, group: string}> $items
	 * @return array<int, array{token: string, label: string, description: string, group: string}>
	 */
	public static function append_design_placeholders( array $items ): array {
		$items[] = array(
			'token'       => '{{grants.total}}',
			'label'       => __( 'Total KPF grants', 'kpf-core' ),
			'description' => __( 'Formatted sum of published grant amounts. Same value as %%grants_total%%.', 'kpf-core' ),
			'group'       => 'site',
		);
		return $items;
	}

	public static function bust_cache( int $post_id = 0 ): void {
		unset( $post_id );
		delete_transient( self::TRANSIENT_KEY );
	}

	public static function bust_cache_on_delete( int $post_id ): void {
		if ( ContentType::POST_TYPE !== get_post_type( $post_id ) ) {
			return;
		}
		self::bust_cache();
	}

	/**
	 * Sum of published grant amounts (USD).
	 */
	public static function amount(): float {
		$cached = get_transient( self::TRANSIENT_KEY );
		if ( is_numeric( $cached ) ) {
			return max( 0.0, (float) $cached );
		}

		global $wpdb;
		$sum = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COALESCE(SUM(CAST(pm.meta_value AS DECIMAL(14,2))), 0)
				FROM {$wpdb->postmeta} pm
				INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
				WHERE pm.meta_key = %s
					AND p.post_type = %s
					AND p.post_status = 'publish'",
				Meta::SORT_AMOUNT_KEY,
				ContentType::POST_TYPE
			)
		);

		$amount = is_numeric( $sum ) ? max( 0.0, round( (float) $sum, 2 ) ) : 0.0;
		set_transient( self::TRANSIENT_KEY, $amount, DAY_IN_SECONDS );
		return $amount;
	}

	/**
	 * Currency label for the total (empty when zero).
	 */
	public static function label(): string {
		return self::format_amount( self::amount() );
	}

	public static function format_amount( float $amount ): string {
		if ( $amount <= 0 ) {
			return '';
		}
		$decimals = abs( $amount - round( $amount ) ) < 0.00001 ? 0 : 2;
		return '$' . number_format_i18n( $amount, $decimals );
	}

	/**
	 * @return array{amount: float, label: string}
	 */
	public static function payload(): array {
		$amount = self::amount();
		return array(
			'amount' => $amount,
			'label'  => self::format_amount( $amount ),
		);
	}
}
