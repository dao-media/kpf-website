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

	echo "Structured Gutenberg GraphQL smoke test passed.\n";
} finally {
	wp_delete_post( $page_id, true );
}
