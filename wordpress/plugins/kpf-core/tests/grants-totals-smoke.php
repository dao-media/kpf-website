<?php
/**
 * Smoke: Grants\Totals label + SEO tag registration.
 *
 * Run: wp eval-file wp-content/plugins/kpf-core/tests/grants-totals-smoke.php
 */

use KPF\Core\Grants\Totals;
use KPF\Core\Seo\Tags\Registry as SeoTagRegistry;

function kpf_grants_totals_assert( bool $ok, string $message ): void {
	echo ( $ok ? 'PASS' : 'FAIL' ) . ": {$message}\n";
	if ( ! $ok ) {
		exit( 1 );
	}
}

Totals::bust_cache();
$payload = Totals::payload();
kpf_grants_totals_assert( is_array( $payload ), 'payload is array' );
kpf_grants_totals_assert( array_key_exists( 'amount', $payload ), 'payload has amount' );
kpf_grants_totals_assert( array_key_exists( 'label', $payload ), 'payload has label' );
kpf_grants_totals_assert( is_float( $payload['amount'] ) || is_int( $payload['amount'] ), 'amount is numeric' );

$label = Totals::format_amount( 50000.0 );
kpf_grants_totals_assert( '$50,000' === $label, 'format_amount(50000) => $50,000' );

SeoTagRegistry::boot();
$resolved = SeoTagRegistry::resolve( 'grants_total' );
kpf_grants_totals_assert( is_string( $resolved ), '%%grants_total%% resolves to string' );

$catalog = SeoTagRegistry::catalog();
$found   = false;
foreach ( $catalog as $tag ) {
	if ( ( $tag['token'] ?? '' ) === 'grants_total' ) {
		$found = true;
		kpf_grants_totals_assert(
			( $tag['invocation'] ?? '' ) === '%%grants_total%%',
			'catalog invocation is %%grants_total%%'
		);
		break;
	}
}
kpf_grants_totals_assert( $found, 'grants_total is in SEO tag catalog' );

echo "grants-totals-smoke: ok\n";
