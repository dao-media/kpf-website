<?php

declare(strict_types=1);

namespace KPF\Core\Seo;

use KPF\Core\Seo\Tags\Engine;
use WP_Post;

final class Schema {
	/**
	 * @param array<string, mixed> $settings
	 * @param array<string, mixed> $entity
	 * @return array<int, array<string, mixed>>
	 */
	public static function build_for_post(
		WP_Post $post,
		array $settings,
		string $canonical,
		string $title,
		string $description,
		string $schema_type,
		string $image_url,
		array $entity
	): array {
		$graph   = array();
		$schema  = $settings['schema'];
		$org_id  = trailingslashit(Resolver::frontend_url($settings, '/')) . '#organization';
		$web_id  = trailingslashit(Resolver::frontend_url($settings, '/')) . '#website';
		$page_id = $canonical . '#webpage';

		if (! empty($schema['enable_website'])) {
			$graph[] = self::website_node($settings, $web_id, $org_id);
		}

		if (! empty($schema['enable_webpage']) || in_array($schema_type, array( 'WebPage', 'AboutPage', 'ContactPage', 'CollectionPage' ), true)) {
			$page_type = in_array($schema_type, array( 'AboutPage', 'ContactPage', 'CollectionPage', 'WebPage' ), true)
				? $schema_type
				: 'WebPage';
			$web_page  = array(
				'@type'       => $page_type,
				'@id'         => $page_id,
				'url'         => $canonical,
				'name'        => $title,
				'description' => $description,
				'isPartOf'    => array( '@id' => $web_id ),
				'inLanguage'  => get_bloginfo('language'),
			);
			if ($image_url !== '') {
				$web_page['primaryImageOfPage'] = $image_url;
			}
			$graph[] = $web_page;
		}

		if (! empty($schema['enable_article']) && in_array($schema_type, array( 'Article', 'NewsArticle', 'BlogPosting' ), true)) {
			$primary_category = PrimaryTerms::resolve(
				$post,
				'category',
				isset($entity['primary_category_id']) ? (int) $entity['primary_category_id'] : null
			);
			$primary_topic = PrimaryTerms::resolve(
				$post,
				'post_tag',
				isset($entity['primary_topic_id']) ? (int) $entity['primary_topic_id'] : null
			);

			$headline = get_the_title($post) ?: $title;
			$author_name = self::author_display_name((int) $post->post_author);
			$author      = array(
				'@type' => 'Person',
				'name'  => $author_name !== '' ? $author_name : get_bloginfo('name'),
			);

			$article = array(
				'@type'            => $schema_type,
				'@id'              => $canonical . '#article',
				'headline'         => $headline,
				'description'      => $description,
				'datePublished'    => get_the_date('c', $post),
				'dateModified'     => get_the_modified_date('c', $post),
				'mainEntityOfPage' => array( '@id' => $page_id ),
				'author'           => $author,
				'publisher'        => array( '@id' => $org_id ),
			);
			if ($image_url !== '') {
				$article['image'] = array(
					'@type' => 'ImageObject',
					'url'   => $image_url,
				);
			}

			if ($primary_category) {
				$article['articleSection'] = (string) $primary_category->name;
			}

			$keywords = array();
			if (! empty($entity['focus_keyphrase'])) {
				$keywords[] = (string) $entity['focus_keyphrase'];
			}
			if ($primary_topic) {
				$keywords[] = (string) $primary_topic->name;
			}
			$topic_terms = get_the_terms($post, 'post_tag');
			if (is_array($topic_terms)) {
				foreach ($topic_terms as $term) {
					if ($term instanceof \WP_Term && ( ! $primary_topic || (int) $term->term_id !== (int) $primary_topic->term_id )) {
						$keywords[] = (string) $term->name;
					}
				}
			}
			$keywords = array_values(array_unique(array_filter($keywords)));
			if ($keywords !== array()) {
				$article['keywords'] = implode(', ', $keywords);
			}

			$graph[] = $article;
		}

		if (! empty($schema['enable_breadcrumbs'])) {
			$primary_category = PrimaryTerms::resolve(
				$post,
				'category',
				isset($entity['primary_category_id']) ? (int) $entity['primary_category_id'] : null
			);
			$graph[] = self::breadcrumb_node($post, $settings, $canonical, $title, $primary_category);
		}

		$org = self::organization_node($settings, $org_id);
		if ($org) {
			array_unshift($graph, $org);
		}

		if ('about' === $post->post_name) {
			$person = self::person_node($org_id, $canonical, $image_url);
			$graph[] = $person;
			foreach ($graph as $index => $node) {
				if (($node['@id'] ?? '') === $page_id) {
					$graph[ $index ]['about']      = array( '@id' => $person['@id'] );
					$graph[ $index ]['mainEntity'] = array( '@id' => $person['@id'] );
				}
			}
		}

		if ('events' === $post->post_name) {
			foreach (self::event_nodes($settings, $org_id, $canonical) as $event_node) {
				$graph[] = $event_node;
			}
		}

		$custom = $entity['custom_json_ld'] ?? ($schema['custom_json_ld'] ?? '');
		if (is_string($custom) && $custom !== '') {
			$rendered = Engine::render($custom, Resolver::context_for_post($post, $settings));
			$decoded  = json_decode($rendered, true);
			if (is_array($decoded)) {
				$graph[] = $decoded;
			}
		}

		return array(
			'@context' => 'https://schema.org',
			'@graph'   => $graph,
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	public static function build_for_home(
		array $settings,
		string $canonical,
		string $title,
		string $description,
		string $image_url
	): array {
		$graph  = array();
		$schema = $settings['schema'];
		$org_id = trailingslashit($canonical) . '#organization';
		$web_id = trailingslashit($canonical) . '#website';

		$org = self::organization_node($settings, $org_id);
		if ($org) {
			$graph[] = $org;
		}

		if (! empty($schema['enable_website'])) {
			$graph[] = self::website_node($settings, $web_id, $org_id);
		}

		if (! empty($schema['enable_webpage'])) {
			$web_page = array(
				'@type'       => 'WebPage',
				'@id'         => $canonical . '#webpage',
				'url'         => $canonical,
				'name'        => $title,
				'description' => $description,
				'isPartOf'    => array( '@id' => $web_id ),
				'about'       => array( '@id' => $org_id ),
			);
			if ($image_url !== '') {
				$web_page['image'] = $image_url;
			}
			$graph[] = $web_page;
		}

		return array(
			'@context' => 'https://schema.org',
			'@graph'   => array_values(array_filter($graph)),
		);
	}

	/**
	 * First + last name when set, otherwise the WordPress display name.
	 */
	private static function author_display_name(int $user_id): string {
		$first = trim((string) get_the_author_meta('first_name', $user_id));
		$last  = trim((string) get_the_author_meta('last_name', $user_id));
		$full  = trim($first . ' ' . $last);
		if ($full !== '') {
			return $full;
		}
		return trim((string) get_the_author_meta('display_name', $user_id));
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>|null
	 */
	private static function organization_node(array $settings, string $org_id): ?array {
		$schema = $settings['schema'];
		$name   = (string) ($schema['organization_name'] ?: PageDefaults::ORG_NAME);
		$url    = \KPF\Core\Support\FrontendUrl::to_public(
			(string) ($schema['organization_url'] ?: Resolver::frontend_url($settings, '/'))
		);
		$logo   = ! empty($schema['organization_logo'])
			? \KPF\Core\Media\PublicUrls::image_url((int) $schema['organization_logo'], 'full')
			: PageDefaults::logo_url();

		$node = array(
			'@type'           => array( 'NGO', 'NonprofitOrganization' ),
			'@id'             => $org_id,
			'name'            => $name,
			'legalName'       => (string) ($schema['legal_name'] ?: PageDefaults::LEGAL_NAME),
			'alternateName'   => 'Kevin Popke Foundation',
			'url'             => $url,
			'nonprofitStatus' => 'https://schema.org/Nonprofit501c3',
			'areaServed'      => array(
				array(
					'@type' => 'AdministrativeArea',
					'name'  => 'Tampa Bay',
				),
				array(
					'@type' => 'State',
					'name'  => 'Florida',
					'containedInPlace' => array(
						'@type' => 'Country',
						'name'  => 'United States',
					),
				),
			),
		);

		$same = array_values(
			array_filter(
				array(
					(string) ($schema['facebook_url'] ?? ''),
					(string) ($schema['instagram_url'] ?? ''),
				)
			)
		);
		if ($same === array()) {
			$same = PageDefaults::same_as();
		}
		$node['sameAs'] = $same;

		$founding = (string) ($schema['founding_date'] ?? PageDefaults::FOUNDING_DATE);
		if ($founding !== '') {
			$node['foundingDate'] = $founding;
		}

		if ($logo !== '') {
			$node['logo'] = array(
				'@type' => 'ImageObject',
				'url'   => $logo,
			);
			$node['image'] = $logo;
		}

		$description = trim((string) ($settings['global']['home_description'] ?? ''));
		if (! PageDefaults::is_usable_description($description)) {
			$description = PageDefaults::HOME_DESCRIPTION;
		}
		$node['description'] = $description;

		return $node;
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	private static function website_node(array $settings, string $web_id, string $org_id): array {
		$search = rtrim(Resolver::frontend_url($settings, '/search'), '/');

		return array(
			'@type'          => 'WebSite',
			'@id'            => $web_id,
			'url'            => Resolver::frontend_url($settings, '/'),
			'name'           => (string) ($settings['global']['site_title'] ?: get_bloginfo('name')),
			'publisher'      => array( '@id' => $org_id ),
			'inLanguage'     => get_bloginfo('language'),
			'potentialAction'=> array(
				'@type'       => 'SearchAction',
				'target'      => array(
					'@type'        => 'EntryPoint',
					'urlTemplate'  => $search . '?q={search_term_string}',
				),
				'query-input' => 'required name=search_term_string',
			),
		);
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return array<string, mixed>
	 */
	private static function breadcrumb_node(
		WP_Post $post,
		array $settings,
		string $canonical,
		string $title,
		?\WP_Term $primary_category = null
	): array {
		$trail = Breadcrumbs::for_post($post, $settings, $canonical, $title, $primary_category);
		$items = array();
		foreach ($trail as $index => $crumb) {
			$items[] = array(
				'@type'    => 'ListItem',
				'position' => $index + 1,
				'name'     => $crumb['name'],
				'item'     => $crumb['url'],
			);
		}

		return array(
			'@type'           => 'BreadcrumbList',
			'@id'             => $canonical . '#breadcrumb',
			'itemListElement' => $items,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function person_node(string $org_id, string $canonical, string $image_url): array {
		$person_id = $canonical . '#kevin-popke';
		$node      = array(
			'@type'          => 'Person',
			'@id'            => $person_id,
			'name'           => 'Donald “Kevin” Popke',
			'givenName'      => 'Donald',
			'additionalName' => 'Kevin',
			'familyName'     => 'Popke',
			'alternateName'  => array( 'Kevin Popke', '50' ),
			'honorificSuffix'=> '1SG, U.S. Army (Ret.)',
			'jobTitle'       => 'U.S. Army First Sergeant and Airborne Ranger',
			'description'    => 'Donald “Kevin” Popke was a retired U.S. Army First Sergeant, paratrooper, and Department of Defense contractor. The Kevin Popke Foundation funds Florida veteran charities in his honor.',
			'memberOf'       => array( '@id' => $org_id ),
			'url'            => $canonical,
		);
		if ($image_url !== '') {
			$node['image'] = $image_url;
		}
		return $node;
	}

	/**
	 * @param array<string, mixed> $settings
	 * @return list<array<string, mixed>>
	 */
	private static function event_nodes(array $settings, string $org_id, string $canonical): array {
		if (! class_exists(\KPF\Core\Events\ContentType::class) || ! class_exists(\KPF\Core\Events\Meta::class)) {
			return array();
		}

		$query = new \WP_Query(
			array(
				'post_type'              => \KPF\Core\Events\ContentType::POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => 20,
				'orderby'                => 'date',
				'order'                  => 'DESC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$nodes = array();
		foreach ($query->posts as $event) {
			if (! $event instanceof WP_Post) {
				continue;
			}
			$meta      = \KPF\Core\Events\Meta::get((int) $event->ID);
			$start     = \KPF\Core\Events\Meta::schema_start($meta);
			if ($start === '') {
				continue;
			}

			$details = \KPF\Core\Events\GraphQL::details((int) $event->ID);
			$node    = array(
				'@type'               => 'Event',
				'@id'                 => $canonical . '#event-' . (int) $event->ID,
				'name'                => get_the_title($event),
				'startDate'           => $start,
				'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
				'eventStatus'         => 'https://schema.org/EventScheduled',
				'organizer'           => array( '@id' => $org_id ),
				'url'                 => $canonical,
			);

			$description = trim((string) ($details['description'] ?? ''));
			if ($description === '') {
				$description = trim((string) ($details['logline'] ?? ''));
			}
			if ($description !== '') {
				$node['description'] = $description;
			}

			$place_name = (string) ($details['location']['display'] ?? '');
			if ($place_name !== '') {
				$place = array(
					'@type' => 'Place',
					'name'  => $place_name,
				);
				$location = is_array($meta['location'] ?? null) ? $meta['location'] : array();
				$line1    = trim((string) ($location['line1'] ?? ''));
				$city     = trim((string) ($location['city'] ?? ''));
				$region   = trim((string) ($location['state'] ?? ''));
				if ($line1 !== '' || $city !== '') {
					$place['address'] = array_filter(
						array(
							'@type'           => 'PostalAddress',
							'streetAddress'   => $line1,
							'addressLocality' => $city,
							'addressRegion'   => $region,
							'postalCode'      => (string) ($location['postal_code'] ?? ''),
							'addressCountry'  => 'US',
						)
					);
				}
				$node['location'] = $place;
			}

			$tickets = (string) ($details['ticketingLink'] ?? '');
			if ($tickets !== '') {
				$node['offers'] = array(
					'@type'        => 'Offer',
					'url'          => $tickets,
					'availability' => 'https://schema.org/InStock',
				);
			}

			$thumb = get_the_post_thumbnail_url($event, 'full');
			if (is_string($thumb) && $thumb !== '') {
				$node['image'] = \KPF\Core\Media\PublicUrls::to_wp_host($thumb);
			}

			$nodes[] = $node;
		}

		return $nodes;
	}
}
