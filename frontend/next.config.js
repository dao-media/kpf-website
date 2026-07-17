const { createSecureHeaders } = require('next-secure-headers');
const { withFaust, getWpHostname } = require('@faustwp/core');

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withFaust({
	reactStrictMode: true,
	sassOptions: {
		loadPaths: ['node_modules'],
	},
	images: {
		domains: [getWpHostname()],
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: createSecureHeaders({
					xssProtection: false,
				}),
			},
		];
	},
	async rewrites() {
		return [
			{
				source: '/robots.txt',
				destination: '/api/seo/robots',
			},
			{
				source: '/sitemap.xml',
				destination: '/api/seo/sitemap',
			},
			{
				source: '/sitemap-:type-:page.xml',
				destination: '/api/seo/sitemap/:type/:page',
			},
		];
	},
});
