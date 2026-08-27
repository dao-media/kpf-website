<?php

/**
 * Admin hostname helpers (no WordPress bootstrap).
 */

require_once dirname( __DIR__ ) . '/includes/Admin/AdminHost.php';
require_once dirname( __DIR__, 3 ) . '/mu-plugins/kpf-admin-host.php';

use KPF\Core\Admin\AdminHost;

function kpf_admin_host_assert( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, $message . "\n" );
		exit( 1 );
	}
}

kpf_admin_host_assert(
	AdminHost::is_admin_host( 'admin.kevinpopkefoundation.org' ),
	'vanity host is recognized'
);
kpf_admin_host_assert(
	AdminHost::is_admin_host( 'ADMIN.kevinpopkefoundation.org:443' ),
	'vanity host ignores port and case'
);
kpf_admin_host_assert(
	AdminHost::is_legacy_cms_host( 'kpf.dreamhosters.com' ),
	'legacy CMS host is recognized'
);
kpf_admin_host_assert(
	AdminHost::should_redirect_legacy_admin( 'kpf.dreamhosters.com', '/wp-admin/', false ),
	'direct DreamHost wp-admin redirects to vanity'
);
kpf_admin_host_assert(
	AdminHost::should_redirect_legacy_admin( 'kpf.dreamhosters.com', '/wp-login.php', false ),
	'direct DreamHost login redirects to vanity'
);
kpf_admin_host_assert(
	! AdminHost::should_redirect_legacy_admin( 'kpf.dreamhosters.com', '/wp-admin/', true ),
	'Vercel proxy to DreamHost must not bounce back to vanity'
);
kpf_admin_host_assert(
	! AdminHost::should_redirect_legacy_admin( 'kpf.dreamhosters.com', '/graphql', false ),
	'GraphQL stays on the WordPress origin'
);
kpf_admin_host_assert(
	! AdminHost::should_redirect_legacy_admin( 'kpf.dreamhosters.com', '/wp-json/wp/v2/posts', false ),
	'REST stays on the WordPress origin'
);

kpf_admin_host_assert(
	KPF_PUBLIC_ORIGIN === kpf_admin_host_resolve_home( false, true ),
	'vanity home is the public origin, not the admin host'
);
kpf_admin_host_assert(
	KPF_ADMIN_ORIGIN === kpf_admin_host_resolve_siteurl( false, true ),
	'vanity siteurl stays the admin origin'
);
kpf_admin_host_assert(
	KPF_PUBLIC_ORIGIN === kpf_admin_host_resolve_home( 'https://kpf.dreamhosters.com', false ),
	'dreamhosters home option rewrites to the public origin'
);
kpf_admin_host_assert(
	KPF_PUBLIC_ORIGIN === kpf_admin_host_resolve_home( 'https://admin.kevinpopkefoundation.org', false ),
	'admin-host home option rewrites to the public origin'
);
kpf_admin_host_assert(
	'http://localhost:8888' === kpf_admin_host_resolve_home( 'http://localhost:8888', false ),
	'localhost home is left alone'
);
kpf_admin_host_assert(
	false === kpf_admin_host_resolve_home( false, false ),
	'non-vanity pre_option_home does not short-circuit'
);
kpf_admin_host_assert(
	'https://kpf.dreamhosters.com' === kpf_admin_host_resolve_siteurl( 'https://kpf.dreamhosters.com', false ),
	'non-vanity siteurl stays the stored CMS origin'
);

kpf_admin_host_assert(
	'https://kevinpopkefoundation.org/' === AdminHost::visit_site_href(),
	'Visit Site href is the public home'
);
kpf_admin_host_assert(
	AdminHost::href_is_cms_front( 'https://admin.kevinpopkefoundation.org/' ),
	'admin vanity front is a CMS front URL'
);
kpf_admin_host_assert(
	! AdminHost::href_is_cms_front( 'https://admin.kevinpopkefoundation.org/wp-admin/' ),
	'wp-admin on the vanity host is not rewritten'
);
kpf_admin_host_assert(
	'https://kevinpopkefoundation.org/' === AdminHost::rewrite_href_to_public( 'https://admin.kevinpopkefoundation.org/' ),
	'admin vanity front rewrites to the public origin'
);
kpf_admin_host_assert(
	'https://kevinpopkefoundation.org/about/' === AdminHost::rewrite_href_to_public( 'https://kpf.dreamhosters.com/about/' ),
	'DreamHost front paths rewrite to the public origin'
);
kpf_admin_host_assert(
	'https://admin.kevinpopkefoundation.org/wp-admin/' === AdminHost::rewrite_href_to_public( 'https://admin.kevinpopkefoundation.org/wp-admin/' ),
	'wp-admin hrefs are not rewritten to the public origin'
);
kpf_admin_host_assert(
	'https://kevinpopkefoundation.org/blog/?p=1#comments' === AdminHost::rewrite_href_to_public( 'https://admin.kevinpopkefoundation.org/blog/?p=1#comments' ),
	'query and hash survive a public rewrite'
);

kpf_admin_host_assert(
	'https://kevinpopkefoundation.org/' === kpf_admin_host_rewrite_redirect( 'https://kpf.dreamhosters.com/', true ),
	'vanity redirect of the DreamHost front goes public'
);
kpf_admin_host_assert(
	'https://admin.kevinpopkefoundation.org/wp-admin/' === kpf_admin_host_rewrite_redirect( 'https://kpf.dreamhosters.com/wp-admin/', true ),
	'vanity redirect of DreamHost wp-admin stays on the admin origin'
);
kpf_admin_host_assert(
	'https://kpf.dreamhosters.com/' === kpf_admin_host_rewrite_redirect( 'https://kpf.dreamhosters.com/', false ),
	'non-vanity redirects are not rewritten'
);

echo "admin-host-smoke OK\n";
