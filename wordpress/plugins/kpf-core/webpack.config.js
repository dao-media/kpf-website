const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
	...defaultConfig,
	entry: {
		components: path.resolve(__dirname, 'src/blocks/index.js'),
		'seo-admin': path.resolve(__dirname, 'src/seo-admin/index.js'),
		'seo-editor': path.resolve(__dirname, 'src/seo-editor/index.js'),
		'scrapbook-editor': path.resolve(__dirname, 'src/scrapbook-editor/index.js'),
		'performance-admin': path.resolve(__dirname, 'src/performance-admin/index.js'),
	},
};
