import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { RegistryProvider, useDispatch, useRegistry, useSelect } from '@wordpress/data';
import {
	createRoot,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { SeoFields, emptySeoMeta } from '../seo-fields/SeoFields';
import { watchPostFieldTags } from './injectPostFieldTags';
import './style.css';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfSeoEditor?.nonce || ''));

const META_KEY = window.kpfSeoEditor?.metaKey || '_kpf_seo';
const SUPPORTED_POST_TYPES = window.kpfSeoEditor?.postTypes || ['post'];
const FIELD_TAGS = window.kpfSeoEditor?.fieldTags || {};
const CANVAS_ROOT_ID = 'kpf-seo-canvas-root';

const SEO_LABEL_TAGS = {
	'seo.focus_keyphrase': FIELD_TAGS['seo.focus_keyphrase'] || '%%focuskw%%',
	'seo.title': FIELD_TAGS['seo.title'] || '%%title%%',
	'seo.description': FIELD_TAGS['seo.description'] || '%%excerpt%%',
	'seo.canonical': FIELD_TAGS['seo.canonical'] || '%%permalink%%',
};

function mediaSourceUrl(select, mediaId) {
	if (!mediaId) {
		return '';
	}
	const media = select('core')?.getMedia?.(mediaId);
	return media?.source_url || media?.media_details?.sizes?.large?.source_url || '';
}

function useBlogSeoState() {
	const postType = useSelect(
		(select) => select('core/editor')?.getCurrentPostType() || 'post',
		[]
	);
	const postId = useSelect((select) => select('core/editor')?.getCurrentPostId(), []);
	const seoMeta = useSelect((select) => {
		const meta = select('core/editor')?.getEditedPostAttribute?.('meta');
		const value = meta?.[META_KEY];
		return value && !Array.isArray(value) ? value : null;
	}, []);
	const featuredMediaId = useSelect(
		(select) => select('core/editor')?.getEditedPostAttribute?.('featured_media') || 0,
		[]
	);
	const postTitle = useSelect(
		(select) => select('core/editor')?.getEditedPostAttribute?.('title') || '',
		[]
	);
	const postExcerpt = useSelect(
		(select) => select('core/editor')?.getEditedPostAttribute?.('excerpt') || '',
		[]
	);
	const { editPost } = useDispatch('core/editor');
	const [tags, setTags] = useState([]);
	const [preview, setPreview] = useState({ title: '', description: '', openGraph: null });

	const seo = useMemo(() => ({ ...emptySeoMeta(), ...(seoMeta || {}) }), [seoMeta]);
	const supported = SUPPORTED_POST_TYPES.includes(postType);

	const liveImageUrl = useSelect(
		(select) => {
			const ogId = seo.og_image_id || 0;
			return mediaSourceUrl(select, ogId) || mediaSourceUrl(select, featuredMediaId);
		},
		[seo.og_image_id, featuredMediaId]
	);

	useEffect(() => {
		if (!supported) return undefined;
		apiFetch({ path: '/kpf-seo/v1/tags' })
			.then((response) => setTags(response.tags || []))
			.catch(() => setTags([]));
		return undefined;
	}, [supported]);

	useEffect(() => {
		if (!supported || !postId) return undefined;
		let cancelled = false;
		const handle = setTimeout(() => {
			apiFetch({
				path: `/kpf-seo/v1/resolve/${postId}`,
				method: 'POST',
				data: {
					seo,
					title: postTitle,
					excerpt: postExcerpt,
					featured_media: featuredMediaId || 0,
				},
			})
				.then((response) => {
					if (cancelled) return;
					setPreview({
						title: response.title || '',
						description: response.description || '',
						openGraph: response.openGraph || null,
					});
				})
				.catch(() => {
					if (!cancelled) {
						setPreview({ title: '', description: '', openGraph: null });
					}
				});
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(handle);
		};
	}, [
		supported,
		postId,
		postTitle,
		postExcerpt,
		featuredMediaId,
		seo.title_template,
		seo.description_template,
		seo.og_title,
		seo.og_description,
		seo.og_image_id,
		seo.twitter_title,
		seo.twitter_description,
		seo.twitter_image_id,
		seo.primary_category_id,
		seo.primary_topic_id,
		seo.focus_keyphrase,
		seo.robots_index,
		seo.robots_follow,
		seo.robots_noarchive,
		seo.robots_nosnippet,
		seo.canonical,
		seo.show_in_sitemap,
	]);

	const livePreview = useMemo(() => {
		if (!liveImageUrl) {
			return preview;
		}
		return {
			...preview,
			openGraph: {
				...(preview.openGraph || {}),
				imageUrl: liveImageUrl,
			},
		};
	}, [preview, liveImageUrl]);

	function updateSeo(next) {
		const currentMeta =
			wp.data.select('core/editor').getEditedPostAttribute('meta') || {};
		editPost({
			meta: {
				...currentMeta,
				[META_KEY]: next,
			},
		});
	}

	return {
		supported,
		postType,
		seo,
		preview: livePreview,
		tags,
		updateSeo,
	};
}

function ensureCanvasHost() {
	const visual =
		document.querySelector('.edit-post-visual-editor') ||
		document.querySelector('.editor-visual-editor');
	if (!visual) {
		return null;
	}

	let host = document.getElementById(CANVAS_ROOT_ID);
	if (!host) {
		host = document.createElement('div');
		host.id = CANVAS_ROOT_ID;
	}
	host.className = 'kpf-seo-canvas-root kpf-seo-canvas-root--post';

	// Mount as a sibling AFTER the visual editor. Placing it inside the iframed
	// scale container (iframe.after) gets clipped by overflow:hidden and is
	// never scrollable into view.
	if (visual.nextElementSibling !== host) {
		visual.after(host);
	}
	return host;
}

function BlogSeoPanel() {
	const { seo, preview, tags, updateSeo } = useBlogSeoState();
	return (
		<div
			className="kpf-seo-canvas-panel"
			onKeyDown={(event) => event.stopPropagation()}
		>
			<SeoFields
				seo={seo}
				preview={preview}
				tags={tags}
				onChange={updateSeo}
				collapseDetailsByDefault
				designTags={SEO_LABEL_TAGS}
			/>
		</div>
	);
}

function SeoCanvasMount() {
	const { supported, postType } = useBlogSeoState();
	const registry = useRegistry();
	const rootRef = useRef(null);
	const hostRef = useRef(null);

	useEffect(() => {
		if (!supported || postType !== 'post') {
			return undefined;
		}

		let cancelled = false;
		let observer;

		const mountOnce = () => {
			if (cancelled) return false;
			const host = ensureCanvasHost();
			if (!host) return false;

			// Mount into a detached root, but keep the block editor data registry
			// so useEntityProp/useSelect stay live (otherwise fields won't accept input).
			if (!rootRef.current || hostRef.current !== host) {
				rootRef.current?.unmount();
				hostRef.current = host;
				rootRef.current = createRoot(host);
				rootRef.current.render(
					<RegistryProvider value={registry}>
						<BlogSeoPanel />
					</RegistryProvider>
				);
			} else {
				ensureCanvasHost();
			}
			return true;
		};

		observer = new MutationObserver(() => {
			if (mountOnce() && rootRef.current) {
				observer.disconnect();
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		if (mountOnce()) {
			observer.disconnect();
		}

		return () => {
			cancelled = true;
			observer?.disconnect();
			rootRef.current?.unmount();
			rootRef.current = null;
			hostRef.current = null;
			document.getElementById(CANVAS_ROOT_ID)?.remove();
		};
	}, [supported, postType, registry]);

	return null;
}

function SeoDocumentPanel() {
	const { supported, seo, preview, tags, updateSeo } =
		useBlogSeoState();

	if (!supported) {
		return null;
	}

	return (
		<PluginDocumentSettingPanel
			name="kpf-blog-seo"
			title={__('Search & sharing', 'kpf-core')}
			className="kpf-seo-document-panel"
		>
			<SeoFields
				seo={seo}
				preview={preview}
				tags={tags}
				onChange={updateSeo}
				compact
				designTags={SEO_LABEL_TAGS}
			/>
		</PluginDocumentSettingPanel>
	);
}

function SeoEditorPlugin() {
	const postType = useSelect(
		(select) => select('core/editor')?.getCurrentPostType() || 'post',
		[]
	);

	useEffect(() => {
		if (!SUPPORTED_POST_TYPES.includes(postType)) {
			return undefined;
		}
		return watchPostFieldTags(FIELD_TAGS);
	}, [postType]);

	return (
		<>
			<SeoDocumentPanel />
			<SeoCanvasMount />
		</>
	);
}

registerPlugin('kpf-seo-editor', {
	render: SeoEditorPlugin,
	icon: 'chart-area',
});
