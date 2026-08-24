const { createSecureHeaders } = require('next-secure-headers');
const { withFaust, getWpHostname } = require('@faustwp/core');

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withFaust({
	reactStrictMode: true,
	env: {
		// Inlined at build time. Set to "1" on Vercel while DreamHost is missing
		// WPGraphQL Content Blocks so Faust prerender can skip editorBlocks.
		KPF_SKIP_EDITOR_BLOCKS: process.env.KPF_SKIP_EDITOR_BLOCKS || "",
	},
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
				headers: [
					...createSecureHeaders({
						xssProtection: false,
					}),
					{
						key: 'Link',
						value: '</llms.txt>; rel="describedby"',
					},
				],
			},
			{
				source: '/llms.txt',
				headers: [
					{
						key: 'Content-Type',
						value: 'text/markdown; charset=utf-8',
					},
				],
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
				source: '/kpf-stylesheet.css',
				destination: '/api/kpf-stylesheet',
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
