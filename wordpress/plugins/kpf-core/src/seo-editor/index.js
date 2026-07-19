import { registerPlugin } from '@wordpress/plugins';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import {
	createRoot,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { SeoFields, emptySeoMeta } from '../seo-fields/SeoFields';
import './style.css';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfSeoEditor?.nonce || ''));

const META_KEY = window.kpfSeoEditor?.metaKey || '_kpf_seo';
const SUPPORTED_POST_TYPES = window.kpfSeoEditor?.postTypes || ['post'];
const CANVAS_ROOT_ID = 'kpf-seo-canvas-root';

function useBlogSeoState() {
	const postType = useSelect((select) => select('core/editor')?.getCurrentPostType(), []);
	const postId = useSelect((select) => select('core/editor')?.getCurrentPostId(), []);
	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');
	const [tags, setTags] = useState([]);
	const [tagQuery, setTagQuery] = useState('');
	const [preview, setPreview] = useState({ title: '', description: '' });

	const seo = useMemo(() => ({ ...emptySeoMeta(), ...(meta?.[META_KEY] || {}) }), [meta]);
	const supported = SUPPORTED_POST_TYPES.includes(postType);

	useEffect(() => {
		if (!supported) return undefined;
		apiFetch({ path: '/kpf-seo/v1/tags' })
			.then((response) => setTags(response.tags || []))
			.catch(() => setTags([]));
		return undefined;
	}, [supported]);

	useEffect(() => {
		if (!supported || !postId) return undefined;
		const handle = setTimeout(() => {
			apiFetch({ path: `/kpf-seo/v1/resolve/${postId}` })
				.then((response) =>
					setPreview({
						title: response.title || '',
						description: response.description || '',
					})
				)
				.catch(() => setPreview({ title: '', description: '' }));
		}, 400);
		return () => clearTimeout(handle);
	}, [
		supported,
		postId,
		seo.title_template,
		seo.description_template,
		seo.og_title,
		seo.og_description,
	]);

	function updateSeo(next) {
		setMeta({
			...meta,
			[META_KEY]: next,
		});
	}

	return {
		supported,
		postType,
		seo,
		preview,
		tags,
		tagQuery,
		setTagQuery,
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

	const iframe =
		visual.querySelector('iframe[name="editor-canvas"]') ||
		visual.querySelector('iframe.editor-canvas__iframe') ||
		visual.querySelector('iframe');

	if (iframe && iframe.nextSibling !== host) {
		iframe.after(host);
	} else if (!host.parentElement) {
		visual.appendChild(host);
	}
	return host;
}

function BlogSeoPanel() {
	const { seo, preview, tags, tagQuery, setTagQuery, updateSeo } = useBlogSeoState();
	return (
		<SeoFields
			seo={seo}
			preview={preview}
			tags={tags}
			tagQuery={tagQuery}
			onTagQueryChange={setTagQuery}
			onChange={updateSeo}
		/>
	);
}

function SeoCanvasMount() {
	const { supported, postType } = useBlogSeoState();
	const rootRef = useRef(null);

	useEffect(() => {
		if (!supported || postType !== 'post') {
			return undefined;
		}

		let cancelled = false;
		let observer;

		const mount = () => {
			if (cancelled) return false;
			const host = ensureCanvasHost();
			if (!host) return false;

			if (!rootRef.current) {
				rootRef.current = createRoot(host);
			}
			rootRef.current.render(<BlogSeoPanel />);
			return true;
		};

		observer = new MutationObserver(() => {
			mount();
		});
		observer.observe(document.body, { childList: true, subtree: true });
		mount();

		return () => {
			cancelled = true;
			observer?.disconnect();
			rootRef.current?.unmount();
			rootRef.current = null;
			document.getElementById(CANVAS_ROOT_ID)?.remove();
		};
	}, [supported, postType]);

	return null;
}

registerPlugin('kpf-seo-editor', {
	render: SeoCanvasMount,
	icon: 'chart-area',
});
