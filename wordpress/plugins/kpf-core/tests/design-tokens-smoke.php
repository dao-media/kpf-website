<?php
/**
 * Smoke tests for Design tokens (parse, registry, sync).
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/design-tokens-smoke.php
 */

use KPF\Core\Design\Tokens\Parser;
use KPF\Core\Design\Tokens\Registry;
use KPF\Core\Design\Tokens\Scanner;
use KPF\Core\Design\Tokens\Sync;
use KPF\Core\Designs\ContentType as DesignsContentType;
use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Stylesheet\Meta as StylesheetMeta;

$GLOBALS['kpf_tokens_failures'] = 0;

function kpf_tokens_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$GLOBALS['kpf_tokens_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

$css = <<<'CSS'
:root { --kpf-ember: #8b1515; --kpf-ink: #12090a; }
.kpf-btn { color: red; padding: 0.5rem; }
CSS;

$parsed = Parser::extract_from_css( $css );
kpf_tokens_assert( isset( $parsed['variables']['--kpf-ember'] ), 'Parser finds CSS variables' );
kpf_tokens_assert( '#8b1515' === $parsed['variables']['--kpf-ember'], 'Parser captures variable values' );
kpf_tokens_assert( isset( $parsed['classes']['.kpf-btn'] ), 'Parser finds class rules' );

$html_classes = Parser::extract_classes_from_html( '<div class="kpf-btn hero-card">x</div>' );
kpf_tokens_assert( in_array( '.kpf-btn', $html_classes, true ), 'Parser finds HTML class names' );

$clean = Registry::sanitize(
	array(
		'variables' => array(
			array( 'name' => 'kpf-ember', 'value' => '#8b1515; evil', 'note' => 'Brand' ),
			array( 'name' => '--', 'value' => 'x' ),
			array( 'name' => '!!!', 'value' => 'y' ),
		),
		'classes'   => array(
			array( 'name' => 'kpf-btn', 'css' => 'color: blue; { hack }', 'note' => '' ),
		),
	)
);
kpf_tokens_assert( '--kpf-ember' === $clean['variables'][0]['name'], 'Registry normalizes variable names' );
kpf_tokens_assert( ! str_contains( $clean['variables'][0]['value'], ';' ), 'Registry strips dangerous chars from values' );
kpf_tokens_assert( '.kpf-btn' === $clean['classes'][0]['name'], 'Registry normalizes class names' );
kpf_tokens_assert( 1 === count( $clean['variables'] ), 'Invalid variable names are dropped' );

$block = Registry::compile_block( $clean );
$with  = Parser::upsert_tokens_block( "body { margin: 0; }\n", $block );
kpf_tokens_assert( str_contains( $with, Parser::MARKER_START ), 'Tokens block markers are inserted' );
kpf_tokens_assert( str_contains( $with, '--kpf-ember' ), 'Compiled block includes variables' );
kpf_tokens_assert( str_contains( Parser::strip_tokens_block( $with ), 'body' ), 'Strip keeps outside CSS' );

$sheet_id = StylesheetMeta::ensure_stylesheet();
kpf_tokens_assert( $sheet_id > 0, 'Stylesheet post exists' );
$before = StylesheetMeta::get_css( $sheet_id );

$design_id = wp_insert_post(
	array(
		'post_type'   => DesignsContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => 'Tokens smoke design',
	),
	true
);
kpf_tokens_assert( ! is_wp_error( $design_id ) && $design_id > 0, 'Design post created for sync test' );

update_post_meta(
	(int) $design_id,
	DesignsMeta::DESIGN_META,
	DesignsMeta::sanitize_design(
		array(
			'html' => '<main class="smoke-hero"><h1 style="color: var(--smoke-accent)">Hi</h1></main>',
			'css'  => '.smoke-hero { color: navy; } :root { --smoke-accent: #abcdef; }',
		)
	)
);

$result = Sync::upsert_variable(
	array(
		'name'  => '--smoke-accent',
		'value' => '#112233',
		'note'  => 'smoke',
	)
);
kpf_tokens_assert( is_array( $result ), 'Upsert variable returns inventory' );

$design_after = DesignsMeta::sanitize_design( get_post_meta( (int) $design_id, DesignsMeta::DESIGN_META, true ) );
kpf_tokens_assert( str_contains( (string) $design_after['css'], '#112233' ), 'Sync updates design CSS variable value' );

$renamed = Sync::update_detected(
	array(
		'kind'    => 'variable',
		'oldName' => '--smoke-accent',
		'name'    => '--smoke-accent-2',
		'value'   => '#112233',
	)
);
kpf_tokens_assert( is_array( $renamed ), 'Rename variable returns inventory' );
$design_renamed = DesignsMeta::sanitize_design( get_post_meta( (int) $design_id, DesignsMeta::DESIGN_META, true ) );
kpf_tokens_assert( str_contains( (string) $design_renamed['css'], '--smoke-accent-2' ), 'Rename updates design CSS' );
kpf_tokens_assert( str_contains( (string) $design_renamed['html'], 'var(--smoke-accent-2)' ), 'Rename updates design HTML var() usage' );

$inventory = Scanner::inventory();
kpf_tokens_assert( ! empty( $inventory['items'] ), 'Scanner returns inventory items' );

// Cleanup smoke artifacts from registry / design; leave stylesheet otherwise intact.
$reg = Registry::get();
$reg['variables'] = array_values(
	array_filter(
		$reg['variables'],
		static fn( array $row ): bool => ! str_starts_with( $row['name'], '--smoke-' )
	)
);
Registry::save( $reg );
Sync::recompile_stylesheet( Registry::get() );
wp_delete_post( (int) $design_id, true );

// Restore stylesheet if we polluted only via tokens block (recompile already ran).
unset( $before );

if ( $GLOBALS['kpf_tokens_failures'] > 0 ) {
	echo "DONE with {$GLOBALS['kpf_tokens_failures']} failure(s)\n";
	exit( 1 );
}

echo "DONE: design tokens smoke passed\n";
