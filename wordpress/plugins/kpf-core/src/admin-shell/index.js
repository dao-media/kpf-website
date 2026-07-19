import { createRoot } from '@wordpress/element';
import {
	Accessibility,
	Blocks,
	Braces,
	CalendarDays,
	CornerDownRight,
	FileText,
	Gauge,
	Images,
	Inbox,
	LayoutDashboard,
	Newspaper,
	Palette,
	Plug,
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
	'#menu-plugins': Plug,
	'#menu-users': Users,
	'#menu-tools': Wrench,
	'#menu-settings': Settings,
	'#toplevel_page_graphiql-ide': Braces,
};

function decorateMenu() {
	Object.entries(menuIcons).forEach(([selector, Icon]) => {
		const host = document.querySelector(`${selector} > a .wp-menu-image`);
		if (!host || host.dataset.kpfLucide === 'true') return;

		host.dataset.kpfLucide = 'true';
		host.classList.add('kpf-lucide-menu-icon');
		createRoot(host).render(<Icon aria-hidden="true" size={17} strokeWidth={1.8} />);
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
decorateScfSubmenu();
addGlassTracking();

const menu = document.getElementById('adminmenu');
if (menu) {
	new MutationObserver(() => {
		decorateMenu();
		decorateScfSubmenu();
	}).observe(menu, { childList: true, subtree: true });
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
