const path = require('path');
const { withFaust, getWpHostname } = require('@faustwp/core');
const {
	ADMIN_CMS_HOST,
	PRODUCTION_ORIGIN,
	VERCEL_PRODUCTION_HOSTS,
	WORDPRESS_CMS_ORIGIN,
} = require('./src/lib/publicSiteUrl');
const {
	createKpfSecureHeaders,
	kpfHstsHeader,
} = require('./src/lib/secureHeaders');

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
		source: '/wp-admin/',
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
	// Keep /wp-admin/ on the CMS host; public trailing slashes are handled in middleware.
	skipTrailingSlashRedirect: true,
	skipMiddlewareUrlNormalize: true,
	env: {
		// Inlined at build time. Set to "1" on Vercel while DreamHost is missing
		// WPGraphQL Content Blocks so Faust prerender can skip editorBlocks.
		KPF_SKIP_EDITOR_BLOCKS: process.env.KPF_SKIP_EDITOR_BLOCKS || "",
	},
	sassOptions: {
		loadPaths: ['node_modules'],
	},
	transpilePackages: ['geist'],
	experimental: {
		optimizePackageImports: ['lucide-react'],
	},
	// Next still injects polyfill-module for every browser. Our browserslist
	// already matches Next 16's modern target, so those Baseline polyfills are
	// unused (PSI ~16 KiB on the framework chunk).
	turbopack: {
		resolveAlias: {
			'../build/polyfills/polyfill-module': './src/lib/empty-polyfill.js',
			'next/dist/build/polyfills/polyfill-module': './src/lib/empty-polyfill.js',
		},
	},
	webpack(config) {
		const emptyPolyfill = path.join(__dirname, 'src/lib/empty-polyfill.js');
		config.resolve.alias = {
			...config.resolve.alias,
			'../build/polyfills/polyfill-module': emptyPolyfill,
			'next/dist/build/polyfills/polyfill-module': emptyPolyfill,
		};
		return config;
	},
	images: {
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60 * 60 * 24 * 30,
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
			{
				protocol: 'https',
				hostname: ADMIN_CMS_HOST,
				pathname: '/wp-content/uploads/**',
			},
		],
	},
	async headers() {
		return [
			{
				source: '/:path*',
				has: [{ type: 'host', value: ADMIN_CMS_HOST }],
				headers: [kpfHstsHeader()],
			},
			{
				source: '/:path*',
				missing: [{ type: 'host', value: ADMIN_CMS_HOST }],
				headers: [
					...createKpfSecureHeaders(),
					{
						key: 'Link',
						value: '</llms.txt>; rel="describedby"',
					},
				],
			},
			{
				source: '/robots.txt',
				headers: [
					{
						key: 'Content-Type',
						value: 'text/plain; charset=utf-8',
					},
					{
						key: 'Cache-Control',
						value: 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
					},
					{
						key: 'CDN-Cache-Control',
						value: 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
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
