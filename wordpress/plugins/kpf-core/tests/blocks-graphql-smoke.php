<?php

if ( ! function_exists( 'graphql' ) ) {
	throw new RuntimeException( 'WPGraphQL is not active.' );
}

if ( ! in_array( 'wp-graphql-content-blocks/wp-graphql-content-blocks.php', (array) get_option( 'active_plugins', array() ), true ) ) {
	throw new RuntimeException( 'WPGraphQL Content Blocks is not active.' );
}

function kpf_blocks_graphql_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}

$content = <<<'HTML'
<!-- wp:kpf/container {"theme":"paper","padding":"large","contentWidth":"wide-inner"} -->
<div class="wp-block-kpf-container kpf-container kpf-container--paper kpf-container--pad-large kpf-container--wide-inner">
<!-- wp:core/paragraph -->
<p>Structured paragraph</p>
<!-- /wp:core/paragraph -->
<!-- wp:kpf/button {"url":"/donate","variant":"secondary","size":"large"} -->
<div class="wp-block-kpf-button kpf-button kpf-button--secondary kpf-button--large has-text-align-left"><a class="kpf-button__link" href="/donate"><span class="kpf-button__label">Donate now</span></a></div>
<!-- /wp:kpf/button -->
</div>
<!-- /wp:kpf/container -->
HTML;

$page_id = wp_insert_post(
	array(
		'post_title'   => 'Structured blocks smoke test',
		'post_name'    => 'structured-blocks-smoke-test',
		'post_content' => $content,
		'post_status'  => 'publish',
		'post_type'    => 'page',
	),
	true
);

if ( is_wp_error( $page_id ) ) {
	throw new RuntimeException( $page_id->get_error_message() );
}

try {
	$query = <<<'GRAPHQL'
query StructuredBlocksSmoke($id: ID!) {
  page(id: $id, idType: DATABASE_ID) {
    editorBlocks(flat: true) {
      name
      clientId
      parentClientId
      ... on KpfContainer {
        attributes {
          contentWidth
          padding
          theme
        }
      }
      ... on CoreParagraph {
        attributes {
          content
        }
      }
      ... on KpfButton {
        attributes {
          size
          text
          url
          variant
        }
      }
    }
  }
}
GRAPHQL;

	$result = graphql(
		array(
			'query'     => $query,
			'variables' => array( 'id' => (string) $page_id ),
		)
	);

	kpf_blocks_graphql_assert( empty( $result['errors'] ), 'Structured block query returned GraphQL errors.' );

	$blocks = $result['data']['page']['editorBlocks'] ?? array();
	kpf_blocks_graphql_assert( 3 === count( $blocks ), 'Expected container, paragraph, and button blocks.' );
	kpf_blocks_graphql_assert( 'kpf/container' === $blocks[0]['name'], 'Container block was not first.' );
	kpf_blocks_graphql_assert( 'paper' === $blocks[0]['attributes']['theme'], 'Container theme was not resolved.' );
	kpf_blocks_graphql_assert( 'core/paragraph' === $blocks[1]['name'], 'Paragraph block was not nested.' );
	kpf_blocks_graphql_assert( 'Structured paragraph' === $blocks[1]['attributes']['content'], 'Paragraph content was not resolved.' );
	kpf_blocks_graphql_assert( $blocks[1]['parentClientId'] === $blocks[0]['clientId'], 'Paragraph parent relationship was not exposed.' );
	kpf_blocks_graphql_assert( 'kpf/button' === $blocks[2]['name'], 'Button block was not nested.' );
	kpf_blocks_graphql_assert( 'Donate now' === $blocks[2]['attributes']['text'], 'HTML-sourced button text was not resolved.' );
	kpf_blocks_graphql_assert( '/donate' === $blocks[2]['attributes']['url'], 'Button URL was not resolved.' );

	$header_id = wp_insert_post(
		array(
			'post_type'    => 'wp_block',
			'post_status'  => 'publish',
			'post_title'   => 'GraphQL Chrome Header',
			'post_content' => '<!-- wp:paragraph --><p>Chrome header body</p><!-- /wp:paragraph -->',
		),
		true
	);
	$footer_id = wp_insert_post(
		array(
			'post_type'    => 'wp_block',
			'post_status'  => 'publish',
			'post_title'   => 'GraphQL Chrome Footer',
			'post_content' => '<!-- wp:paragraph --><p>Chrome footer body</p><!-- /wp:paragraph -->',
		),
		true
	);

	kpf_blocks_graphql_assert( ! is_wp_error( $header_id ) && ! is_wp_error( $footer_id ), 'Chrome fixtures failed to create.' );

	update_post_meta( (int) $header_id, \KPF\Core\Blocks\Globals::ROLE_META, 'header' );
	update_post_meta(
		(int) $header_id,
		\KPF\Core\Blocks\Globals::BEHAVIOR_META,
		array(
			'mode'            => 'sticky-hide-reveal',
			'retractDelayMs'  => 220,
			'overlayHero'     => true,
			'transparentAtTop'=> true,
			'zIndex'          => 60,
		)
	);
	\KPF\Core\Blocks\Globals::sync_role_map( (int) $header_id, get_post( (int) $header_id ) );

	update_post_meta( (int) $footer_id, \KPF\Core\Blocks\Globals::ROLE_META, 'footer' );
	update_post_meta(
		(int) $footer_id,
		\KPF\Core\Blocks\Globals::BEHAVIOR_META,
		array(
			'mode'      => 'sticky-bottom',
			'fullWidth' => false,
		)
	);
	\KPF\Core\Blocks\Globals::sync_role_map( (int) $footer_id, get_post( (int) $footer_id ) );

	$chrome_query = <<<'GRAPHQL'
query SiteChromeSmoke {
  kpfSiteChrome {
    header {
      databaseId
      title
      role
      html
      behavior {
        mode
        retractDelayMs
        overlayHero
        transparentAtTop
        zIndex
      }
    }
    footer {
      databaseId
      title
      role
      html
      behavior {
        mode
        fullWidth
      }
    }
  }
}
GRAPHQL;

	$chrome_result = graphql( array( 'query' => $chrome_query ) );
	kpf_blocks_graphql_assert( empty( $chrome_result['errors'] ), 'kpfSiteChrome returned GraphQL errors.' );

	$header = $chrome_result['data']['kpfSiteChrome']['header'] ?? null;
	$footer = $chrome_result['data']['kpfSiteChrome']['footer'] ?? null;
	kpf_blocks_graphql_assert( is_array( $header ), 'Header chrome was not returned.' );
	kpf_blocks_graphql_assert( is_array( $footer ), 'Footer chrome was not returned.' );
	kpf_blocks_graphql_assert( (int) $header_id === (int) $header['databaseId'], 'Header ID mismatch.' );
	kpf_blocks_graphql_assert( str_contains( (string) $header['html'], 'Chrome header body' ), 'Header HTML missing.' );
	kpf_blocks_graphql_assert( 'sticky-hide-reveal' === $header['behavior']['mode'], 'Header mode missing.' );
	kpf_blocks_graphql_assert( true === $header['behavior']['overlayHero'], 'Header overlay missing.' );
	kpf_blocks_graphql_assert( str_contains( (string) $footer['html'], 'Chrome footer body' ), 'Footer HTML missing.' );
	kpf_blocks_graphql_assert( 'sticky-bottom' === $footer['behavior']['mode'], 'Footer mode missing.' );
	kpf_blocks_graphql_assert( false === $footer['behavior']['fullWidth'], 'Footer fullWidth missing.' );

	wp_delete_post( (int) $header_id, true );
	wp_delete_post( (int) $footer_id, true );
	delete_option( \KPF\Core\Blocks\Globals::MAP_OPTION );

	echo "Structured Gutenberg GraphQL smoke test passed.\n";
} finally {
	wp_delete_post( $page_id, true );
}
