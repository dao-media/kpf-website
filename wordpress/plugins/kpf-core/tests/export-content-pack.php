<?php
/**
 * Snapshot published library content into kpf-core/data/content-pack
 * and a Faust fallback JSON + public media copies.
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/export-content-pack.php
 */

use KPF\Core\Events\ContentType as EventType;
use KPF\Core\Events\GraphQL as EventsGraphQL;
use KPF\Core\Events\Meta as EventMeta;
use KPF\Core\Forms\ContentType as FormType;
use KPF\Core\Forms\Meta as FormMeta;
use KPF\Core\Grantees\ContentType as GranteeType;
use KPF\Core\Grantees\Meta as GranteeMeta;
use KPF\Core\Grants\ContentType as GrantType;
use KPF\Core\Grants\Meta as GrantMeta;
use KPF\Core\Grants\Totals as GrantTotals;
use KPF\Core\Kevin\ContentType as KevinType;
use KPF\Core\Queries\GraphQL as QueriesGraphQL;
use KPF\Core\Scrapbook\ContentType as ScrapbookType;
use KPF\Core\Scrapbook\GraphQL as ScrapbookGraphQL;
use KPF\Core\Scrapbook\Meta as ScrapbookMeta;

$plugin = KPF_CORE_PATH . 'data/content-pack/';
$media  = $plugin . 'media/';

foreach ( array( $plugin, $media ) as $dir ) {
	if ( ! is_dir( $dir ) && ! mkdir( $dir, 0755, true ) && ! is_dir( $dir ) ) {
		fwrite( STDERR, "Could not create {$dir}\n" );
		exit( 1 );
	}
}

$packed = array();

$pack_media = static function ( int $id ) use ( $media, &$packed ): void {
	if ( $id < 1 || isset( $packed[ $id ] ) ) {
		return;
	}
	$file = get_attached_file( $id );
	if ( ! is_string( $file ) || ! is_readable( $file ) ) {
		return;
	}
	$name = $id . '-' . sanitize_file_name( basename( $file ) );
	copy( $file, $media . $name );
	$packed[ $id ] = array(
		'file'  => $name,
		'title' => (string) get_the_title( $id ),
		'alt'   => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
		'url'   => '/media/content/' . $name,
	);
};

$posts_of = static function ( string $type ): array {
	return get_posts(
		array(
			'post_type'      => $type,
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
		)
	);
};

$forms = array();
foreach ( $posts_of( FormType::POST_TYPE ) as $post ) {
	$forms[] = array(
		'title'      => get_the_title( $post ),
		'slug'       => $post->post_name,
		'definition' => FormMeta::get( (int) $post->ID ),
	);
}

$grantees      = array();
$grantee_slugs = array();
foreach ( $posts_of( GranteeType::POST_TYPE ) as $post ) {
	$thumb = (int) get_post_thumbnail_id( $post );
	$pack_media( $thumb );
	$grantee_slugs[ (int) $post->ID ] = $post->post_name;
	$meta                             = GranteeMeta::get( (int) $post->ID );
	$grantees[]                       = array(
		'title'        => get_the_title( $post ),
		'slug'         => $post->post_name,
		'content'      => $post->post_content,
		'menu_order'   => (int) $post->menu_order,
		'thumbnail_id' => $thumb,
		'meta'         => $meta,
	);
}

$grants = array();
foreach ( $posts_of( GrantType::POST_TYPE ) as $post ) {
	$meta = GrantMeta::get( (int) $post->ID );
	$pack_media( (int) ( $meta['check_photo_id'] ?? 0 ) );
	$thumb = (int) get_post_thumbnail_id( $post );
	$pack_media( $thumb );
	$grants[] = array(
		'title'        => get_the_title( $post ),
		'slug'         => $post->post_name,
		'menu_order'   => (int) $post->menu_order,
		'thumbnail_id' => $thumb,
		'grantee_slug' => $grantee_slugs[ (int) ( $meta['grantee_id'] ?? 0 ) ] ?? '',
		'meta'         => $meta,
	);
}

$scrapbook = array();
foreach ( $posts_of( ScrapbookType::POST_TYPE ) as $post ) {
	$meta = ScrapbookMeta::get( (int) $post->ID );
	foreach ( (array) ( $meta['images'] ?? array() ) as $image ) {
		$pack_media( (int) ( $image['attachment_id'] ?? 0 ) );
	}
	$thumb = (int) get_post_thumbnail_id( $post );
	$pack_media( $thumb );
	$scrapbook[] = array(
		'title'        => get_the_title( $post ),
		'slug'         => $post->post_name,
		'content'      => $post->post_content,
		'menu_order'   => (int) $post->menu_order,
		'thumbnail_id' => $thumb,
		'meta'         => $meta,
	);
}

$kevin = array();
foreach ( $posts_of( KevinType::POST_TYPE ) as $post ) {
	$thumb = (int) get_post_thumbnail_id( $post );
	$pack_media( $thumb );
	$kevin[] = array(
		'title'        => get_the_title( $post ),
		'slug'         => $post->post_name,
		'content'      => $post->post_content,
		'menu_order'   => (int) $post->menu_order,
		'thumbnail_id' => $thumb,
	);
}

$hosts = array();
if ( taxonomy_exists( EventType::HOST_TAXONOMY ) ) {
	$terms = get_terms( array( 'taxonomy' => EventType::HOST_TAXONOMY, 'hide_empty' => false ) );
	if ( ! is_wp_error( $terms ) ) {
		foreach ( $terms as $term ) {
			$logo = (int) get_term_meta( $term->term_id, EventType::HOST_LOGO_META, true );
			$pack_media( $logo );
			$hosts[] = array(
				'name'        => $term->name,
				'slug'        => $term->slug,
				'description' => $term->description,
				'logo_id'     => $logo,
			);
		}
	}
}

$events = array();
foreach ( $posts_of( EventType::POST_TYPE ) as $post ) {
	$meta = EventMeta::get( (int) $post->ID );
	$thumb = (int) get_post_thumbnail_id( $post );
	$pack_media( $thumb );
	$slugs = array();
	foreach ( (array) ( $meta['host_term_ids'] ?? array() ) as $term_id ) {
		$term = get_term( (int) $term_id, EventType::HOST_TAXONOMY );
		if ( $term && ! is_wp_error( $term ) ) {
			$slugs[] = $term->slug;
		}
	}
	$events[] = array(
		'title'        => get_the_title( $post ),
		'slug'         => $post->post_name,
		'content'      => $post->post_content,
		'menu_order'   => (int) $post->menu_order,
		'thumbnail_id' => $thumb,
		'host_slugs'   => $slugs,
		'meta'         => $meta,
	);
}

$blog = array();
foreach ( $posts_of( 'post' ) as $post ) {
	if ( 'hello-world' === $post->post_name ) {
		continue;
	}
	$thumb = (int) get_post_thumbnail_id( $post );
	$pack_media( $thumb );
	$blog[] = array(
		'title'        => get_the_title( $post ),
		'slug'         => $post->post_name,
		'content'      => $post->post_content,
		'excerpt'      => $post->post_excerpt,
		'date'         => $post->post_date,
		'thumbnail_id' => $thumb,
	);
}

$media_out = array();
foreach ( $packed as $id => $info ) {
	$media_out[ (string) $id ] = $info;
}

$manifest = array(
	'kind'     => 'kpf-content-pack',
	'version'  => 1,
	'media'    => $media_out,
	'forms'    => $forms,
	'grantees' => $grantees,
	'grants'   => $grants,
	'scrapbook'=> $scrapbook,
	'kevin'    => $kevin,
	'hosts'    => $hosts,
	'events'   => $events,
	'posts'    => $blog,
);

file_put_contents(
	$plugin . 'manifest.json',
	wp_json_encode( $manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n"
);

$media_url = static function ( int $id ) use ( $packed ): string {
	return (string) ( $packed[ $id ]['url'] ?? '' );
};

$fallback_grants = array();
$query           = QueriesGraphQL::resolve_slug( 'grants' );
foreach ( (array) ( $query['items'] ?? array() ) as $item ) {
	if ( ! is_array( $item ) ) {
		continue;
	}
	$check = 0;
	foreach ( $grants as $row ) {
		if ( ( $row['slug'] ?? '' ) === ( $item['slug'] ?? '' ) ) {
			$check = (int) ( $row['meta']['check_photo_id'] ?? 0 );
			break;
		}
	}
	$grantee_thumb = 0;
	foreach ( $grantees as $row ) {
		if ( ( $row['title'] ?? '' ) === ( $item['recipientName'] ?? '' ) ) {
			$grantee_thumb = (int) ( $row['thumbnail_id'] ?? 0 );
			break;
		}
	}
	$name = trim( (string) ( $item['recipientName'] ?? '' ) );
	if ( '' === $name ) {
		continue;
	}
	$fallback_grants[] = array(
		'id'       => $item['databaseId'] ?? $name,
		'name'     => $name,
		'body'     => (string) ( $item['blurb'] ?? '' ),
		'date'     => (string) ( $item['awardedLabel'] ?? '' ),
		'amount'   => (string) ( $item['grantAmountLabel'] ?? '' ),
		'logoUrl'  => $media_url( $grantee_thumb ),
		'photoUrl' => $media_url( $check ),
		'photoAlt' => $name,
		'href'     => (string) ( $item['website'] ?? '' ),
	);
}

$fallback_tiles = array();
foreach ( ScrapbookGraphQL::tile_list( 200, 0 ) as $tile ) {
	$src = $media_url( (int) ( $tile['attachmentId'] ?? 0 ) );
	if ( '' === $src ) {
		continue;
	}
	$fallback_tiles[] = array(
		'id'            => (string) ( $tile['id'] ?? $tile['databaseId'] ?? $src ),
		'src'           => $src,
		'alt'           => (string) ( $tile['altText'] ?? $tile['title'] ?? 'Scrapbook photo' ),
		'caption'       => (string) ( $tile['caption'] ?? '' ),
		'title'         => (string) ( $tile['title'] ?? '' ),
		'eventDate'     => (string) ( $tile['eventDate'] ?? '' ),
		'datePrecision' => (string) ( $tile['datePrecision'] ?? 'unknown' ),
	);
}

$fallback_kevin = array();
foreach ( $kevin as $row ) {
	$src = $media_url( (int) ( $row['thumbnail_id'] ?? 0 ) );
	if ( '' === $src ) {
		continue;
	}
	$fallback_kevin[] = array(
		'databaseId' => 0,
		'header'     => $row['title'],
		'body'       => wp_strip_all_tags( (string) $row['content'] ),
		'imageUrl'   => $src,
		'imageAlt'   => $row['title'],
		'menuOrder'  => (int) $row['menu_order'],
	);
}

$fallback_partners = array();
foreach ( $grantees as $row ) {
	$logo = $media_url( (int) ( $row['thumbnail_id'] ?? 0 ) );
	$name = (string) $row['title'];
	if ( '' === $logo || '' === $name ) {
		continue;
	}
	$fallback_partners[] = array(
		'databaseId' => 0,
		'name'       => $name,
		'website'    => (string) ( $row['meta']['website'] ?? '' ),
		'logoUrl'    => $logo,
		'logoAlt'    => $name,
	);
}

$contact = null;
foreach ( $forms as $form ) {
	if ( ( $form['slug'] ?? '' ) === 'contact' ) {
		$contact = array(
			'databaseId'     => 0,
			'title'          => $form['title'],
			'slug'           => 'contact',
			'definitionJson' => wp_json_encode( $form['definition'] ),
		);
		break;
	}
}

$totals = class_exists( GrantTotals::class ) ? GrantTotals::payload() : array();

$fallback_events = array();
foreach ( $posts_of( EventType::POST_TYPE ) as $post ) {
	$details = EventsGraphQL::details( (int) $post->ID );
	$hosts   = array();
	foreach ( (array) ( $details['hosts'] ?? array() ) as $host ) {
		if ( ! is_array( $host ) ) {
			continue;
		}
		$logo_id = (int) ( $host['logoId'] ?? 0 );
		$hosts[] = array(
			'termId'  => (int) ( $host['termId'] ?? 0 ),
			'name'    => (string) ( $host['name'] ?? '' ),
			'logoId'  => $logo_id,
			'logoUrl' => $media_url( $logo_id ),
		);
	}
	$location = is_array( $details['location'] ?? null ) ? $details['location'] : array();
	$fallback_events[] = array(
		'databaseId'  => (int) $post->ID,
		'title'       => get_the_title( $post ),
		'slug'        => $post->post_name,
		'eventDetails'=> array(
			'featured'      => ! empty( $details['featured'] ),
			'logline'       => (string) ( $details['logline'] ?? '' ),
			'description'   => (string) ( $details['description'] ?? '' ),
			'scheduleLabel' => (string) ( $details['scheduleLabel'] ?? '' ),
			'timeLabel'     => (string) ( $details['timeLabel'] ?? '' ),
			'calendarUrl'   => (string) ( $details['calendarUrl'] ?? '' ),
			'ticketingLink' => (string) ( $details['ticketingLink'] ?? '' ),
			'website'       => (string) ( $details['website'] ?? '' ),
			'location'      => array(
				'display' => (string) ( $location['display'] ?? '' ),
				'mapsUrl' => (string) ( $location['mapsUrl'] ?? '' ),
			),
			'hosts'         => $hosts,
		),
	);
}

$fallback = array(
	'form'          => $contact,
	'grants'        => $fallback_grants,
	'grantsTotal'   => (string) ( $totals['label'] ?? '' ),
	'scrapbookTiles'=> $fallback_tiles,
	'kevinSlides'   => $fallback_kevin,
	'partnerGrantees' => $fallback_partners,
	'events'        => $fallback_events,
);

file_put_contents( $plugin . 'frontend-fallback.json', wp_json_encode( $fallback, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n" );

echo 'Content pack: ' . count( $grants ) . ' grants, ' . count( $grantees ) . ' grantees, ' . count( $scrapbook ) . " scrapbook, " . count( $kevin ) . " kevin, " . count( $forms ) . " forms, " . count( $packed ) . " media files.\n";
echo "Wrote {$plugin}manifest.json\n";
echo "Wrote {$plugin}frontend-fallback.json\n";
