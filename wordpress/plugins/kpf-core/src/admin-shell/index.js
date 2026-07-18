import { createRoot } from '@wordpress/element';
import {
	Blocks,
	Braces,
	Database,
	FileText,
	Gauge,
	Image,
	Images,
	Inbox,
	LayoutDashboard,
	Newspaper,
	Palette,
	Plug,
	SearchCheck,
	Settings,
	Users,
	Video,
	Wrench,
	Workflow,
} from 'lucide-react';
import './admin.scss';

const menuIcons = {
	'#menu-dashboard': LayoutDashboard,
	'#menu-posts': Newspaper,
	'#menu-media-images': Image,
	'#menu-media-videos': Video,
	'#menu-pages': FileText,
	'#menu-posts-kpf_scrapbook': Images,
	'#toplevel_page_kpf-components': Blocks,
	'#toplevel_page_kpf-inbox': Inbox,
	'#toplevel_page_kpf-seo': SearchCheck,
	'#toplevel_page_kpf-performance': Gauge,
	'#menu-appearance': Palette,
	'#toplevel_page_kpf-interactions': Workflow,
	'#menu-plugins': Plug,
	'#menu-users': Users,
	'#menu-tools': Wrench,
	'#menu-settings': Settings,
	'#toplevel_page_graphiql-ide': Braces,
	'#toplevel_page_edit-post_type-acf-field-group': Database,
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
addGlassTracking();

const menu = document.getElementById('adminmenu');
if (menu) {
	new MutationObserver(decorateMenu).observe(menu, { childList: true, subtree: true });
}
