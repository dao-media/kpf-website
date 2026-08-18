<?php
/**
 * Smoke tests for saved content Queries.
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/queries-smoke.php
 */

use KPF\Core\Queries\ContentType;
use KPF\Core\Queries\GraphQL;
use KPF\Core\Queries\Meta;
use KPF\Core\Queries\Resolver;

$GLOBALS['kpf_query_failures'] = 0;

function kpf_query_assert( bool $condition, string $message ): void {
	if ( $condition ) {
		echo "PASS: {$message}\n";
		return;
	}
	++$GLOBALS['kpf_query_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user( 1 );

$post_type = get_post_type_object( ContentType::POST_TYPE );
kpf_query_assert( (bool) $post_type, 'Query post type is registered' );
kpf_query_assert( false === $post_type->show_ui, 'Query CPT UI is hidden (managed via Code → Queries)' );

$clean = Meta::sanitize(
	array(
		'postType'       => 'post',
		'perPage'        => 3,
		'orderby'        => 'date',
		'order'          => 'DESC',
		'excludeCurrent' => true,
		'metaQuery'      => array(
			array( 'key' => 'featured', 'value' => '1', 'compare' => '=' ),
		),
		'taxonomies'     => array(
			array(
				'taxonomy' => 'category',
				'terms'    => array( 'news' ),
				'operator' => 'IN',
			),
		),
		'related'        => array(
			'enabled'  => true,
			'by'       => 'category',
			'taxonomy' => 'category',
		),
		'pagination'     => array(
			'enabled' => true,
			'perPage' => 2,
		),
		'evil'           => 'ignore-me',
		'perPage'        => 999,
	)
);

kpf_query_assert( 50 === $clean['perPage'], 'perPage is capped at the allowlisted maximum' );
kpf_query_assert( ! isset( $clean['evil'] ), 'Unknown query keys are stripped' );
kpf_query_assert( true === $clean['related']['enabled'], 'Related-posts settings are retained' );
kpf_query_assert( true === $clean['pagination']['enabled'], 'Pagination settings are retained' );
kpf_query_assert( 1 === count( $clean['metaQuery'] ), 'Custom field filters are retained' );

$rejected_php = Meta::sanitize(
	array(
		'postType' => 'attachment',
		'orderby'  => 'meta_value_num; DROP TABLE',
	)
);
kpf_query_assert( 'post' === $rejected_php['postType'], 'Non-public post types fall back to post' );
kpf_query_assert( 'date' === $rejected_php['orderby'], 'Unsafe orderby values are rejected' );

$query_id = wp_insert_post(
	array(
		'post_type'   => ContentType::POST_TYPE,
		'post_status' => 'publish',
		'post_title'  => 'Latest blogs',
		'post_name'   => 'latest-blogs',
	),
	true
);
kpf_query_assert( is_int( $query_id ) && $query_id > 0, 'Query records can be created' );
Meta::update( (int) $query_id, $clean );

$found = Resolver::find_by_slug( 'latest-blogs' );
kpf_query_assert( (int) $query_id === $found, 'Queries can be looked up by slug' );

$sample = wp_insert_post(
	array(
		'post_type'    => 'post',
		'post_status'  => 'publish',
		'post_title'   => 'Query smoke post',
		'post_content' => 'Body',
	),
	true
);
kpf_query_assert( is_int( $sample ) && $sample > 0, 'Sample post can be created for resolution' );

$run = Resolver::run(
	array(
		'postType' => 'post',
		'perPage'  => 5,
		'orderby'  => 'date',
		'order'    => 'DESC',
		'status'   => array( 'publish' ),
	),
	0,
	1
);
kpf_query_assert( ! empty( $run['items'] ), 'Resolver returns published posts' );
kpf_query_assert( isset( $run['pagination']['total'] ), 'Resolver returns pagination metadata' );

$resolved = GraphQL::resolve_slug( 'latest-blogs', 0, 1 );
kpf_query_assert( is_array( $resolved ) && 'latest-blogs' === $resolved['slug'], 'GraphQL resolves published queries by slug' );

$slugs = Resolver::discover_slugs_in_html( '{{#each queries.latest-blogs}}{{title}}{{/each}}' );
kpf_query_assert( in_array( 'latest-blogs', $slugs, true ), 'Design HTML query slug discovery works' );

$allowed_names = array_column( Meta::allowed_post_types(), 'name' );
kpf_query_assert( in_array( 'kpf_kevin', $allowed_names, true ), 'Kevin CPT is allowlisted for Queries' );
kpf_query_assert( in_array( 'kpf_grant', $allowed_names, true ), 'Grants CPT is allowlisted for Queries' );

$kevin_query_id = \KPF\Core\Queries\Defaults::ensure_kevin_query();
kpf_query_assert( $kevin_query_id > 0, 'Built-in Kevin query can be ensured' );
$kevin_def = Meta::get( $kevin_query_id );
kpf_query_assert( 'kpf_kevin' === $kevin_def['postType'], 'Kevin query targets kpf_kevin' );
kpf_query_assert( 'menu_order' === $kevin_def['orderby'], 'Kevin query orders by menu_order' );
kpf_query_assert( 'kevin' === get_post_field( 'post_name', $kevin_query_id ), 'Kevin query slug is kevin' );

$grants_query_id = \KPF\Core\Queries\Defaults::ensure_grants_query();
kpf_query_assert( $grants_query_id > 0, 'Built-in Grants query can be ensured' );
$grants_def = Meta::get( $grants_query_id );
kpf_query_assert( 'kpf_grant' === $grants_def['postType'], 'Grants query targets kpf_grant' );
kpf_query_assert( 'meta_value_num' === $grants_def['orderby'], 'Grants query orders by meta_value_num' );
kpf_query_assert( '_kpf_grant_sort_date' === $grants_def['metaKey'], 'Grants query uses award-date meta key' );
kpf_query_assert( 'grants' === get_post_field( 'post_name', $grants_query_id ), 'Grants query slug is grants' );

$mapped = Resolver::map_item( get_post( (int) $sample ) );
kpf_query_assert( isset( $mapped['content'] ), 'Query items expose stripped content' );
kpf_query_assert( array_key_exists( 'recipientName', $mapped ), 'Query items expose grant card fields' );

wp_delete_post( (int) $sample, true );
wp_delete_post( (int) $query_id, true );

if ( $GLOBALS['kpf_query_failures'] > 0 ) {
	echo "Completed with {$GLOBALS['kpf_query_failures']} failure(s).\n";
	exit( 1 );
}

echo "All Queries smoke tests passed.\n";
