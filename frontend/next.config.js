const { createSecureHeaders } = require('next-secure-headers');
const { withFaust, getWpHostname } = require('@faustwp/core');
const {
	ADMIN_CMS_HOST,
	PRODUCTION_ORIGIN,
	VERCEL_PRODUCTION_HOSTS,
	WORDPRESS_CMS_ORIGIN,
} = require('./src/lib/publicSiteUrl');

const adminCmsRewrites = [
	{
		source: '/',
		has: [{ type: 'host', value: ADMIN_CMS_HOST }],
		destination: `${WORDPRESS_CMS_ORIGIN}/wp-admin/`,
	},
	{
		source: '/wp-admin',
		has: [{ type: 'host', value: ADMIN_CMS_HOST }],
		destination: `${WORDPRESS_CMS_ORIGIN}/wp-admin/`,
	},
	{
		source: '/:path*',
		has: [{ type: 'host', value: ADMIN_CMS_HOST }],
		destination: `${WORDPRESS_CMS_ORIGIN}/:path*`,
	},
];

const vercelAliasRedirects = VERCEL_PRODUCTION_HOSTS.flatMap((host) => [
	{
		source: '/',
		has: [{ type: 'host', value: host }],
		destination: `${PRODUCTION_ORIGIN}/`,
		permanent: true,
	},
	{
		source: '/:path*',
		has: [{ type: 'host', value: host }],
		destination: `${PRODUCTION_ORIGIN}/:path*`,
		permanent: true,
	},
]);

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
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		remotePatterns: [
			{
				protocol: 'https',
				hostname: getWpHostname() || 'kpf.dreamhosters.com',
				pathname: '/wp-content/uploads/**',
			},
			{
				protocol: 'https',
				hostname: 'kpf.dreamhosters.com',
				pathname: '/wp-content/uploads/**',
			},
		],
	},
	async headers() {
		return [
			{
				source: '/:path*',
				missing: [{ type: 'host', value: ADMIN_CMS_HOST }],
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
	async redirects() {
		return [
			...vercelAliasRedirects,
			{
				source: '/about-us',
				destination: '/about',
				permanent: true,
			},
			{
				source: '/about-us/',
				destination: '/about',
				permanent: true,
			},
			{
				source: '/contact-us',
				destination: '/contact',
				permanent: true,
			},
			{
				source: '/contact-us/',
				destination: '/contact',
				permanent: true,
			},
		];
	},
	async rewrites() {
		return {
			beforeFiles: adminCmsRewrites,
			afterFiles: [
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
			],
		};
	},
});
