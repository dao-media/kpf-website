const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
	...defaultConfig,
	entry: {
		'admin-shell': path.resolve(__dirname, 'src/admin-shell/index.js'),
		components: path.resolve(__dirname, 'src/blocks/index.js'),
		'dashboard-admin': path.resolve(__dirname, 'src/dashboard-admin/index.js'),
		'seo-admin': path.resolve(__dirname, 'src/seo-admin/index.js'),
		'seo-editor': path.resolve(__dirname, 'src/seo-editor/index.js'),
		'page-editor': path.resolve(__dirname, 'src/page-editor/index.js'),
		'scrapbook-editor': path.resolve(__dirname, 'src/scrapbook-editor/index.js'),
		'events-editor': path.resolve(__dirname, 'src/events-editor/index.js'),
		'designs-editor': path.resolve(__dirname, 'src/designs-editor/index.js'),
		'designs-admin': path.resolve(__dirname, 'src/designs-admin/index.js'),
		'gsap-admin': path.resolve(__dirname, 'src/gsap-admin/index.js'),
		'performance-admin': path.resolve(__dirname, 'src/performance-admin/index.js'),
		'dynamic-content-admin': path.resolve(__dirname, 'src/dynamic-content-admin/index.js'),
		'queries-admin': path.resolve(__dirname, 'src/queries-admin/index.js'),
		'accessibility-admin': path.resolve(__dirname, 'src/accessibility-admin/index.js'),
		'stylesheet-admin': path.resolve(__dirname, 'src/stylesheet-admin/index.js'),
	},
};
