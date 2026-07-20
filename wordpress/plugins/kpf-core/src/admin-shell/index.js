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
	Paintbrush,
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
	'#menu-appearance': Palette,
	'#toplevel_page_kpf-accessibility': Accessibility,
	'#toplevel_page_kpf-interactions': Workflow,
	'#menu-posts-kpf_code': Code2,
	'#menu-plugins': Plug,
	'#menu-users': Users,
	'#menu-tools': Wrench,
	'#menu-settings': Settings,
	// GraphQL keeps its official elephant logo — do not Lucide-replace it.
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
	'wp-admin-bar-customize': Paintbrush,
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

function decorateMenu() {
	Object.entries(menuIcons).forEach(([selector, Icon]) => {
		const host = document.querySelector(`${selector} > a .wp-menu-image`);
		if (!host || host.dataset.kpfLucide === 'true') return;

		host.dataset.kpfLucide = 'true';
		host.classList.add('kpf-lucide-menu-icon');
		createRoot(host).render(<Icon aria-hidden="true" size={17} strokeWidth={1.8} />);
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
addGlassTracking();

const menu = document.getElementById('adminmenu');
if (menu) {
	new MutationObserver(() => {
		decorateMenu();
		decorateScfSubmenu();
	}).observe(menu, { childList: true, subtree: true });
}

const adminBar = document.getElementById('wpadminbar');
if (adminBar) {
	new MutationObserver(() => {
		decorateAdminBar();
	}).observe(adminBar, { childList: true, subtree: true });
}

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
