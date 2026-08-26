<?php

/**
 * Admin hostname helpers (no WordPress bootstrap).
 */

require_once dirname( __DIR__ ) . '/includes/Admin/AdminHost.php';

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

echo "admin-host-smoke OK\n";
