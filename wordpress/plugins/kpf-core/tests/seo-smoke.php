<?php
/**
 * Smoke tests for KPF SEO. Run with:
 * npx wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/seo-smoke.php
 */

use KPF\Core\Seo\Redirects\Matcher;
use KPF\Core\Seo\Redirects\Repository;
use KPF\Core\Seo\Redirects\Table;
use KPF\Core\Seo\Resolver;
use KPF\Core\Seo\Sanitizer;
use KPF\Core\Seo\Settings;
use KPF\Core\Seo\Sitemaps;
use KPF\Core\Seo\Tags\Engine;
use KPF\Core\Seo\Tags\Registry;

$GLOBALS['kpf_seo_failures'] = 0;

function kpf_assert(bool $condition, string $message) {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}
	++$GLOBALS['kpf_seo_failures'];
	echo "FAIL: {$message}\n";
}

Table::install();
Settings::ensure_defaults();
Registry::boot();

$settings = Settings::get();
kpf_assert(isset($settings['global']['title_template']), 'settings defaults load');

$rendered = Engine::render('%%sitename%% %%sep%% %%title%%', array(
	'sitename' => 'KPF',
	'sep'      => '|',
	'title'    => 'Hello',
));
kpf_assert($rendered === 'KPF | Hello', 'dynamic tag engine renders tokens');

$unknown = Engine::render('%%not_a_real_tag%% and %%title%%', array( 'title' => 'Only' ));
kpf_assert($unknown === 'and Only' || $unknown === 'Only', 'unknown tags resolve empty');

$meta = Sanitizer::sanitize_custom_meta(array(
	array( 'name' => 'http-equiv', 'content' => 'refresh' ),
	array( 'name' => 'author', 'content' => '%%sitename%%' ),
));
kpf_assert(count($meta) === 1 && $meta[0]['name'] === 'author', 'custom meta allowlist strips http-equiv');

$post_id = wp_insert_post(array(
	'post_title'   => 'SEO Smoke Post',
	'post_content' => 'Body content for excerpt generation.',
	'post_status'  => 'publish',
	'post_type'    => 'post',
));
kpf_assert($post_id > 0, 'creates smoke post');

update_post_meta(
	$post_id,
	'_kpf_seo',
	array(
		'title_template' => '%%title%% %%sep%% Custom',
		'robots_index'   => false,
	)
);

$resolved = Resolver::for_post((int) $post_id);
kpf_assert(str_contains((string) $resolved['title'], 'SEO Smoke Post'), 'resolver uses entity title template');
kpf_assert($resolved['robots']['index'] === false, 'entity robots override wins');
kpf_assert(! empty($resolved['schema']['@graph']), 'schema graph generated');

$home = Resolver::for_home();
kpf_assert($home['canonical'] !== '', 'home canonical present');

$redirect = Repository::create(array(
	'source_path' => '/old-smoke-path',
	'target_url'  => 'http://localhost:3000/new-smoke-path',
	'status_code' => 301,
	'is_enabled'  => true,
));
kpf_assert(! is_wp_error($redirect), 'redirect create succeeds');
$match = Matcher::match('/old-smoke-path');
kpf_assert(is_array($match) && $match['target_url'] === 'http://localhost:3000/new-smoke-path', 'exact redirect matches');

$loop = Repository::create(array(
	'source_path' => '/loop-me',
	'target_url'  => 'http://localhost:3000/loop-me',
));
kpf_assert(is_wp_error($loop), 'redirect loop rejected');

$index = Sitemaps::index();
kpf_assert(isset($index['sitemaps']), 'sitemap index payload exists');

$settings = Settings::get();
$robots_allow = Sitemaps::robots_txt($settings);
kpf_assert(str_contains($robots_allow, 'User-agent: GPTBot'), 'robots.txt includes AI agent directives by default');
kpf_assert(str_contains($robots_allow, 'User-agent: ClaudeBot'), 'robots.txt includes ClaudeBot');
kpf_assert(
	preg_match('/User-agent: GPTBot\nAllow: \//', $robots_allow) === 1,
	'AI agents are allowed to crawl by default'
);

$blocked = $settings;
$blocked['sitemaps']['ai_crawlers'] = 'block';
$robots_block = Sitemaps::robots_txt($blocked);
kpf_assert(
	preg_match('/User-agent: GPTBot\nDisallow: \//', $robots_block) === 1,
	'AI agents can be blocked via settings'
);

$off = $settings;
$off['sitemaps']['ai_crawlers'] = 'off';
$robots_off = Sitemaps::robots_txt($off);
kpf_assert(! str_contains($robots_off, 'User-agent: GPTBot'), 'AI rules can be turned off');

$with_extra = $settings;
$with_extra['sitemaps']['robots_extra'] = "User-agent: BadBot\nDisallow: /";
$robots_extra = Sitemaps::robots_txt($with_extra);
kpf_assert(str_contains($robots_extra, 'User-agent: BadBot'), 'custom robots.txt rules are appended');

$tags = Registry::catalog();
kpf_assert(count($tags) >= 10, 'tag catalog populated');

kpf_assert(
	class_exists(\KPF\Core\Seo\Editor::class),
	'SEO editor module is available for page/blog edit screens'
);

if ($post_id) {
	wp_delete_post($post_id, true);
}
if (! is_wp_error($redirect) && isset($redirect['id'])) {
	Repository::delete((int) $redirect['id']);
}

if ($GLOBALS['kpf_seo_failures'] > 0) {
	echo "Completed with {$GLOBALS['kpf_seo_failures']} failure(s).\n";
	exit(1);
}

echo "All SEO smoke tests passed.\n";
