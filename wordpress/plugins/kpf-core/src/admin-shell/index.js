import { createRoot } from '@wordpress/element';
import {
	Accessibility,
	ArrowDownToLine,
	Blocks,
	CalendarDays,
	Code2,
	CornerDownRight,
	Eye,
	FileText,
	Gauge,
	Globe,
	House,
	Images,
	Inbox,
	LayoutDashboard,
	Menu,
	MessageSquare,
	Newspaper,
	Palette,
	Pencil,
	Plus,
	Plug,
	Search,
	SearchCheck,
	Settings,
	Users,
	UsersRound,
	Wrench,
	Workflow,
} from 'lucide-react';
import './admin.scss';

const menuIcons = {
	'#menu-dashboard': LayoutDashboard,
	'#menu-posts': Newspaper,
	'#menu-media': Images,
	'#menu-posts-kpf_event': CalendarDays,
	'#menu-posts-kpf_team': UsersRound,
	'#menu-pages': FileText,
	'#menu-posts-kpf_scrapbook': Images,
	'#toplevel_page_kpf-components': Blocks,
	'#toplevel_page_kpf-inbox': Inbox,
	'#toplevel_page_kpf-seo': SearchCheck,
	'#toplevel_page_kpf-performance': Gauge,
	'#toplevel_page_kpf-stylesheet': Palette,
	'#toplevel_page_kpf-accessibility': Accessibility,
	'#toplevel_page_kpf-interactions': Workflow,
	'#menu-posts-kpf_code': Code2,
	'#menu-plugins': Plug,
	'#menu-users': Users,
	'#menu-tools': Wrench,
	'#menu-settings': Settings,
	// GraphQL keeps its official elephant logo; tinted via tintSvgMenuIcons().
};

/** Top admin bar (#wpadminbar) — GraphQL / WP logo / avatar stay as-is. */
const adminBarIcons = {
	'wp-admin-bar-menu-toggle': Menu,
	'wp-admin-bar-site-name': House,
	'wp-admin-bar-updates': ArrowDownToLine,
	'wp-admin-bar-comments': MessageSquare,
	'wp-admin-bar-new-content': Plus,
	'wp-admin-bar-edit': Pencil,
	'wp-admin-bar-view': Eye,
	'wp-admin-bar-search': Search,
	'wp-admin-bar-kpf-performance': Gauge,
	'wp-admin-bar-archive': Globe,
};

const ADMIN_BAR_SKIP = new Set([
	'wp-admin-bar-wp-logo',
	'wp-admin-bar-wpgraphql-ide',
	'wp-admin-bar-my-account',
	'wp-admin-bar-user-info',
]);

function ensureExpandedActiveSubmenus() {
	if (document.body.classList.contains('folded')) {
		document.querySelectorAll('#adminmenu > li.kpf-submenu-expanded').forEach((item) => {
			item.classList.remove('kpf-submenu-expanded');
		});
		return;
	}

	document.querySelectorAll('#adminmenu > li.wp-has-submenu').forEach((item) => {
		const submenu = item.querySelector(':scope > .wp-submenu');
		if (!submenu) {
			return;
		}

		const hasActiveChild = Boolean(
			submenu.querySelector('li.current, a.current, [aria-current="page"]')
		);
		const markedOpen =
			item.classList.contains('wp-has-current-submenu') ||
			item.classList.contains('wp-menu-open');

		if (!hasActiveChild && !markedOpen) {
			item.classList.remove('kpf-submenu-expanded');
			return;
		}

		// Keep active sections expanded even when WP only marks a child `.current`
		// (e.g. Comments under Inbox) without reliably applying open classes.
		if (!item.classList.contains('wp-has-current-submenu')) {
			item.classList.add('wp-has-current-submenu');
		}
		if (!item.classList.contains('wp-menu-open')) {
			item.classList.add('wp-menu-open');
		}
		if (!item.classList.contains('kpf-submenu-expanded')) {
			item.classList.add('kpf-submenu-expanded');
		}
		item.classList.remove('wp-not-current-submenu');

		const topLink = item.querySelector(':scope > a.menu-top');
		if (topLink) {
			if (!topLink.classList.contains('wp-has-current-submenu')) {
				topLink.classList.add('wp-has-current-submenu');
			}
			topLink.classList.remove('wp-not-current-submenu');
		}
	});
}

function decorateMenu() {
	Object.entries(menuIcons).forEach(([selector, Icon]) => {
		const host = document.querySelector(`${selector} > a .wp-menu-image`);
		if (!host || host.dataset.kpfLucide === 'true') return;

		host.dataset.kpfLucide = 'true';
		host.classList.add('kpf-lucide-menu-icon');
		createRoot(host).render(<Icon aria-hidden="true" size={17} strokeWidth={1.8} />);
	});

	tintSvgMenuIcons();
}

/**
 * WPGraphQL (and similar plugins) register menu icons as fixed-fill SVG
 * background-images. Remap them through a CSS mask so they pick up the same
 * muted / hover / current colors as Lucide icons via currentColor.
 */
function tintSvgMenuIcons() {
	document
		.querySelectorAll('#adminmenu > li > a.menu-top .wp-menu-image.svg')
		.forEach((host) => {
			if (host.dataset.kpfSvgTint === 'true' || host.dataset.kpfLucide === 'true') {
				return;
			}

			const background = host.style.backgroundImage || '';
			const match = background.match(/url\((['"]?)(data:image\/svg\+xml[^'")]+)\1\)/i);
			if (!match) {
				return;
			}

			const svgUrl = match[2];
			host.dataset.kpfSvgTint = 'true';
			host.classList.add('kpf-svg-menu-icon');
			host.style.backgroundImage = 'none';
			host.style.setProperty('-webkit-mask-image', `url("${svgUrl}")`);
			host.style.setProperty('mask-image', `url("${svgUrl}")`);
		});
}

function ensureAdminBarIconHost(item) {
	let host = item.querySelector(':scope > .ab-item .ab-icon, :scope > .ab-item > .ab-icon');
	if (host) return host;

	const link = item.querySelector(':scope > .ab-item');
	if (!link) return null;

	host = document.createElement('span');
	host.className = 'ab-icon';
	host.setAttribute('aria-hidden', 'true');
	link.prepend(host);
	return host;
}

function decorateAdminBar() {
	const bar = document.getElementById('wpadminbar');
	if (!bar) return;

	Object.entries(adminBarIcons).forEach(([id, Icon]) => {
		if (ADMIN_BAR_SKIP.has(id)) return;

		const item = document.getElementById(id);
		if (!item) return;

		// Respect existing brand/site artwork (blavatar, custom images).
		if (item.querySelector('.blavatar, img')) return;

		const host = ensureAdminBarIconHost(item);
		if (!host || host.dataset.kpfLucide === 'true') return;

		const link = item.querySelector(':scope > .ab-item');
		if (link) {
			link.classList.add('kpf-lucide-ab-item');
		}

		host.dataset.kpfLucide = 'true';
		host.classList.add('kpf-lucide-ab-icon');
		createRoot(host).render(<Icon aria-hidden="true" size={18} strokeWidth={1.8} />);
	});
}

function decorateScfSubmenu() {
	// Skip the main SCF (Field Groups) link; only nest under Tools children.
	const links = document.querySelectorAll(
		[
			'#menu-tools .wp-submenu a[href*="acf-post-type"]',
			'#menu-tools .wp-submenu a[href*="acf-taxonomy"]',
			'#menu-tools .wp-submenu a[href*="acf-ui-options-page"]',
			'#menu-tools .wp-submenu a[href*="acf-tools"]',
			'#menu-tools .wp-submenu a[href*="scf-beta-features"]',
		].join(',')
	);

	links.forEach((link) => {
		if (link.dataset.kpfScfIcon === 'true') return;

		link.dataset.kpfScfIcon = 'true';
		link.classList.add('kpf-scf-submenu-link');

		const host = document.createElement('span');
		host.className = 'kpf-scf-submenu-icon';
		host.setAttribute('aria-hidden', 'true');
		link.prepend(host);
		createRoot(host).render(
			<CornerDownRight aria-hidden="true" size={13} strokeWidth={1.8} />
		);
	});
}

function addGlassTracking() {
	const menu = document.getElementById('adminmenu');
	if (!menu || menu.dataset.kpfGlassTracking === 'true') return;

	menu.dataset.kpfGlassTracking = 'true';
	menu.addEventListener('pointermove', (event) => {
		const link = event.target.closest('a.menu-top');
		if (!link) return;

		const rect = link.getBoundingClientRect();
		link.style.setProperty('--kpf-glass-x', `${event.clientX - rect.left}px`);
		link.style.setProperty('--kpf-glass-y', `${event.clientY - rect.top}px`);
	});
}

decorateMenu();
decorateAdminBar();
decorateScfSubmenu();
ensureExpandedActiveSubmenus();
addGlassTracking();

const menu = document.getElementById('adminmenu');
if (menu) {
	new MutationObserver(() => {
		decorateMenu();
		decorateScfSubmenu();
		ensureExpandedActiveSubmenus();
	}).observe(menu, { childList: true, subtree: true });
}

const adminBar = document.getElementById('wpadminbar');
if (adminBar) {
	new MutationObserver(() => {
		decorateAdminBar();
	}).observe(adminBar, { childList: true, subtree: true });
}

// Folded/auto-fold toggles change whether submenus should stay inline.
new MutationObserver(() => {
	ensureExpandedActiveSubmenus();
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

function revealAdminShell() {
	window.clearTimeout(window.kpfAdminPaintFallback);
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			document.documentElement.classList.add('kpf-admin-ready');
			document.documentElement.classList.remove('kpf-admin-booting');
		});
	});
}

revealAdminShell();
