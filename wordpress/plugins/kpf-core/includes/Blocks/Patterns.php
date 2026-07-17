<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

final class Patterns {
	private const SEED_VERSION = '1';

	public static function register(): void {
		add_action('init', array( self::class, 'seed' ), 50);
	}

	public static function seed(): void {
		if (self::SEED_VERSION === get_option('kpf_component_patterns_version')) {
			return;
		}

		foreach (self::definitions() as $definition) {
			self::ensure_pattern($definition);
		}

		update_option('kpf_component_patterns_version', self::SEED_VERSION, false);
	}

	/**
	 * @return array<int, array<string, string>>
	 */
	private static function definitions(): array {
		return array(
			array(
				'slug'    => 'kpf-donation-call-to-action',
				'title'   => __('Donation call to action', 'kpf-core'),
				'group'   => 'actions',
				'content' => '<!-- wp:kpf/call-to-action {"eyebrow":"Make a difference","heading":"Help carry Kevin’s legacy forward","body":"Your support helps the foundation create opportunities and preserve stories that matter.","theme":"ink","layout":"split"} --><section class="wp-block-kpf-call-to-action kpf-cta kpf-cta--ink kpf-cta--split"><div class="kpf-cta__copy"><p class="kpf-cta__eyebrow">Make a difference</p><h2 class="kpf-cta__heading">Help carry Kevin’s legacy forward</h2><p class="kpf-cta__body">Your support helps the foundation create opportunities and preserve stories that matter.</p></div><div class="kpf-cta__actions"><!-- wp:kpf/button {"text":"Donate now","variant":"secondary","size":"large"} --><div class="wp-block-kpf-button kpf-button kpf-button--secondary kpf-button--large has-text-align-left"><a class="kpf-button__link"><span class="kpf-button__label">Donate now</span></a></div><!-- /wp:kpf/button --></div></section><!-- /wp:kpf/call-to-action -->',
			),
			array(
				'slug'    => 'kpf-frequently-asked-questions',
				'title'   => __('Frequently asked questions', 'kpf-core'),
				'group'   => 'information',
				'content' => '<!-- wp:heading --><h2 class="wp-block-heading">Frequently asked questions</h2><!-- /wp:heading --><!-- wp:kpf/disclosure {"summary":"How can I support the foundation?"} --><details class="wp-block-kpf-disclosure kpf-disclosure"><summary class="kpf-disclosure__summary">How can I support the foundation?</summary><div class="kpf-disclosure__content"><!-- wp:paragraph --><p>Add the answer here, including any helpful links or contact information.</p><!-- /wp:paragraph --></div></details><!-- /wp:kpf/disclosure --><!-- wp:kpf/disclosure {"summary":"Who can participate?"} --><details class="wp-block-kpf-disclosure kpf-disclosure"><summary class="kpf-disclosure__summary">Who can participate?</summary><div class="kpf-disclosure__content"><!-- wp:paragraph --><p>Explain eligibility and the simplest next step.</p><!-- /wp:paragraph --></div></details><!-- /wp:kpf/disclosure -->',
			),
			array(
				'slug'    => 'kpf-featured-story-card',
				'title'   => __('Featured story card', 'kpf-core'),
				'group'   => 'content',
				'content' => '<!-- wp:kpf/card {"heading":"A story worth sharing","body":"Add a short summary that helps visitors understand why this matters.","linkText":"Read the story","variant":"paper"} --><article class="wp-block-kpf-card kpf-card kpf-card--paper"><div class="kpf-card__content"><h3 class="kpf-card__heading">A story worth sharing</h3><p class="kpf-card__body">Add a short summary that helps visitors understand why this matters.</p></div></article><!-- /wp:kpf/card -->',
			),
			array(
				'slug'    => 'kpf-important-notice',
				'title'   => __('Important notice', 'kpf-core'),
				'group'   => 'information',
				'content' => '<!-- wp:kpf/notice {"heading":"Important information","body":"Use this space for information visitors should not miss.","tone":"information"} --><aside class="wp-block-kpf-notice kpf-notice kpf-notice--information"><span class="kpf-notice__icon" aria-hidden="true">i</span><div><h3 class="kpf-notice__heading">Important information</h3><p class="kpf-notice__body">Use this space for information visitors should not miss.</p></div></aside><!-- /wp:kpf/notice -->',
			),
		);
	}

	/**
	 * @param array<string, string> $definition
	 */
	private static function ensure_pattern(array $definition): void {
		$existing = get_page_by_path($definition['slug'], OBJECT, 'wp_block');
		$post_id  = $existing instanceof \WP_Post
			? (int) $existing->ID
			: wp_insert_post(
				array(
					'post_type'    => 'wp_block',
					'post_status'  => 'publish',
					'post_name'    => $definition['slug'],
					'post_title'   => $definition['title'],
					'post_content' => $definition['content'],
				)
			);

		if (is_wp_error($post_id) || $post_id < 1) {
			return;
		}

		update_post_meta($post_id, 'wp_pattern_sync_status', 'unsynced');
		wp_set_object_terms($post_id, array( $definition['group'] ), Groups::TAXONOMY, false);
	}
}
