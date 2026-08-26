import {
	createPortal,
	createRoot,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	ArrowUpRight,
	BookHeart,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	FilePenLine,
	HandCoins,
	Maximize2,
	PencilLine,
	Users,
	X,
} from 'lucide-react';
import './admin.scss';

const data = window.kpfResourcesAdmin || {};

const icons = {
	BookHeart,
	FilePenLine,
	HandCoins,
	PencilLine,
	Users,
};

function Icon({ name, size = 22, strokeWidth = 1.8 }) {
	const Component = icons[name] || BookHeart;
	return <Component aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
}

function Section({ section }) {
	return (
		<div className="kpf-resources-card__section">
			<h3>{section.title}</h3>
			<ul>
				{(section.items || []).map((item, index) => (
					<li
						dangerouslySetInnerHTML={{ __html: item }}
						key={`${section.title}-${index}`}
					/>
				))}
			</ul>
		</div>
	);
}

function collectShots(card) {
	const many = (Array.isArray(card.screenshots) ? card.screenshots : []).filter(
		(shot) => shot?.src
	);
	if (many.length) {
		return many;
	}
	return card.screenshot?.src ? [card.screenshot] : [];
}

function enlargeLabel(shot) {
	if (shot?.alt) {
		return sprintf(__('Enlarge screenshot: %s', 'kpf-core'), shot.alt);
	}
	return __('Enlarge screenshot', 'kpf-core');
}

function ShotImage({ shot, expanded, onEnlarge, buttonRef }) {
	if (!shot?.src) {
		return null;
	}

	return (
		<button
			aria-expanded={expanded}
			aria-haspopup="dialog"
			aria-label={enlargeLabel(shot)}
			className="kpf-resources-zoom"
			onClick={onEnlarge}
			ref={buttonRef}
			type="button"
		>
			<img
				alt=""
				decoding="async"
				src={shot.src}
				style={
					shot.objectPosition
						? { objectPosition: shot.objectPosition }
						: undefined
				}
			/>
			<span className="kpf-resources-zoom__hint" aria-hidden="true">
				<Maximize2 size={15} strokeWidth={2.2} />
			</span>
		</button>
	);
}

function Lightbox({ shots, index, onClose, onGo }) {
	const closeRef = useRef(null);
	const onCloseRef = useRef(onClose);
	const onGoRef = useRef(onGo);
	const indexRef = useRef(index);
	const total = shots.length;
	const current = shots[index] || shots[0];
	const caption =
		current?.caption ||
		(total > 1
			? sprintf(__('Screenshot %1$d of %2$d', 'kpf-core'), index + 1, total)
			: '');
	const titleId = useId();

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);
	useEffect(() => {
		onGoRef.current = onGo;
	}, [onGo]);
	useEffect(() => {
		indexRef.current = index;
	}, [index]);

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		closeRef.current?.focus();

		const onKey = (event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onCloseRef.current();
				return;
			}
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				onGoRef.current(indexRef.current - 1);
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				onGoRef.current(indexRef.current + 1);
			}
		};

		document.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', onKey);
		};
	}, []);

	if (!current) {
		return null;
	}

	return createPortal(
		<div
			className="kpf-resources-lightbox"
			onClick={onClose}
			role="presentation"
		>
			<div
				aria-labelledby={caption ? titleId : undefined}
				aria-modal="true"
				className="kpf-resources-lightbox__dialog"
				onClick={(event) => event.stopPropagation()}
				role="dialog"
			>
				<button
					aria-label={__('Close enlarged screenshot', 'kpf-core')}
					className="kpf-resources-lightbox__close"
					onClick={onClose}
					ref={closeRef}
					type="button"
				>
					<X aria-hidden="true" size={20} strokeWidth={2.2} />
				</button>
				{total > 1 ? (
					<button
						aria-label={__('Previous screenshot', 'kpf-core')}
						className="kpf-resources-lightbox__nav is-prev"
						onClick={() => onGo(index - 1)}
						type="button"
					>
						<ChevronLeft aria-hidden="true" size={28} strokeWidth={2.2} />
					</button>
				) : null}
				<figure>
					<img alt={current.alt || ''} decoding="async" src={current.src} />
					{caption ? (
						<figcaption id={titleId}>{caption}</figcaption>
					) : null}
				</figure>
				{total > 1 ? (
					<button
						aria-label={__('Next screenshot', 'kpf-core')}
						className="kpf-resources-lightbox__nav is-next"
						onClick={() => onGo(index + 1)}
						type="button"
					>
						<ChevronRight aria-hidden="true" size={28} strokeWidth={2.2} />
					</button>
				) : null}
			</div>
		</div>,
		document.body
	);
}

function MediaSlider({ shots }) {
	const [index, setIndex] = useState(0);
	const [open, setOpen] = useState(false);
	const zoomRef = useRef(null);
	const labelId = useId();
	const total = shots.length;
	const current = shots[index] || shots[0];
	const caption = current?.caption || '';
	const closeLightbox = useCallback(() => {
		setOpen(false);
		window.requestAnimationFrame(() => zoomRef.current?.focus());
	}, []);

	const go = useCallback(
		(next) => {
			if (!total) return;
			setIndex(((next % total) + total) % total);
		},
		[total]
	);

	useEffect(() => {
		setIndex(0);
	}, [shots]);

	if (!current) {
		return null;
	}

	const lightbox = open ? (
		<Lightbox
			index={index}
			onClose={closeLightbox}
			onGo={go}
			shots={shots}
		/>
	) : null;

	if (total === 1) {
		return (
			<div className="kpf-resources-card__media">
				<figure>
					<ShotImage
						buttonRef={zoomRef}
						expanded={open}
						onEnlarge={() => setOpen(true)}
						shot={current}
					/>
					{caption ? <figcaption>{caption}</figcaption> : null}
				</figure>
				{lightbox}
			</div>
		);
	}

	return (
		<div
			aria-labelledby={labelId}
			aria-roledescription={__('carousel', 'kpf-core')}
			className="kpf-resources-card__media kpf-resources-card__media--slider"
			onKeyDown={(event) => {
				if (open) {
					return;
				}
				if (event.key === 'ArrowLeft') {
					event.preventDefault();
					go(index - 1);
				}
				if (event.key === 'ArrowRight') {
					event.preventDefault();
					go(index + 1);
				}
			}}
			role="region"
			tabIndex={0}
		>
			<figure>
				<ShotImage
					buttonRef={zoomRef}
					expanded={open}
					onEnlarge={() => setOpen(true)}
					shot={current}
				/>
				<figcaption id={labelId}>
					{caption ||
						sprintf(
							__('Screenshot %1$d of %2$d', 'kpf-core'),
							index + 1,
							total
						)}
				</figcaption>
			</figure>
			<div className="kpf-resources-slider__nav">
				<button
					aria-label={__('Previous screenshot', 'kpf-core')}
					className="kpf-resources-slider__btn"
					onClick={() => go(index - 1)}
					type="button"
				>
					<ChevronLeft aria-hidden="true" size={18} strokeWidth={2.2} />
				</button>
				<span className="kpf-resources-slider__count">
					{index + 1} / {total}
				</span>
				<button
					aria-label={__('Next screenshot', 'kpf-core')}
					className="kpf-resources-slider__btn"
					onClick={() => go(index + 1)}
					type="button"
				>
					<ChevronRight aria-hidden="true" size={18} strokeWidth={2.2} />
				</button>
			</div>
			<div className="kpf-resources-slider__dots" role="tablist">
				{shots.map((shot, shotIndex) => (
					<button
						aria-label={
							shot.caption ||
							sprintf(
								__('Show screenshot %1$d of %2$d', 'kpf-core'),
								shotIndex + 1,
								total
							)
						}
						aria-selected={shotIndex === index}
						className={
							shotIndex === index
								? 'kpf-resources-slider__dot is-active'
								: 'kpf-resources-slider__dot'
						}
						key={shot.src}
						onClick={() => setIndex(shotIndex)}
						role="tab"
						type="button"
					/>
				))}
			</div>
			{lightbox}
		</div>
	);
}

function Card({ card }) {
	const shots = collectShots(card);

	return (
		<article className="kpf-resources-card" id={`kpf-resource-${card.id}`}>
			{shots.length ? <MediaSlider shots={shots} /> : null}
			<header className="kpf-resources-card__header">
				<span className="kpf-resources-card__icon">
					<Icon name={card.icon} />
				</span>
				<div>
					<h2>{card.title}</h2>
					<p>{card.summary}</p>
				</div>
			</header>

			<div className="kpf-resources-card__body">
				{(card.sections || []).map((section) => (
					<Section key={section.title} section={section} />
				))}
			</div>

			{(card.actions || []).length > 0 ? (
				<footer className="kpf-resources-card__actions">
					{card.actions.map((action) => (
						<a
							className={`kpf-resources-button${action.primary ? ' is-primary' : ' is-secondary'}`}
							href={action.url}
							key={action.url + action.label}
						>
							{action.label}
							{action.primary ? (
								<ArrowUpRight aria-hidden="true" size={16} />
							) : (
								<ExternalLink aria-hidden="true" size={15} />
							)}
						</a>
					))}
				</footer>
			) : null}
		</article>
	);
}

function TopicGroup({ group }) {
	const cards = Array.isArray(group.cards) ? group.cards : [];
	if (!cards.length) {
		return null;
	}

	return (
		<section
			aria-labelledby={`kpf-resources-topic-${group.id}`}
			className="kpf-resources-topic"
			id={`kpf-resources-topic-${group.id}`}
		>
			<header className="kpf-resources-topic__header">
				<h2 id={`kpf-resources-topic-${group.id}-title`}>
					{group.title}
				</h2>
				{group.description ? <p>{group.description}</p> : null}
			</header>
			<div className="kpf-resources-grid">
				{cards.map((card) => (
					<Card card={card} key={card.id} />
				))}
			</div>
		</section>
	);
}

function buildGroups() {
	if (Array.isArray(data.groups) && data.groups.length) {
		return data.groups;
	}

	const cards = Array.isArray(data.cards) ? data.cards : [];
	if (!cards.length) {
		return [];
	}

	// Fallback: group flat cards by groupTitle / groupId when present.
	const byKey = new Map();
	cards.forEach((card) => {
		const key = card.groupId || card.groupTitle || 'general';
		if (!byKey.has(key)) {
			byKey.set(key, {
				id: key,
				title: card.groupTitle || __('Guides', 'kpf-core'),
				description: '',
				cards: [],
			});
		}
		byKey.get(key).cards.push(card);
	});
	return [...byKey.values()];
}

function KeyCard({ titleId, title, description, items }) {
	if (!Array.isArray(items) || !items.length) {
		return null;
	}

	return (
		<section
			aria-labelledby={titleId}
			className="kpf-resources-key"
		>
			<header className="kpf-resources-key__header">
				<h2 id={titleId}>{title}</h2>
				{description ? <p>{description}</p> : null}
			</header>
			<dl className="kpf-resources-key__list">
				{items.map((item) => (
					<div className="kpf-resources-key__row" key={item.label}>
						<dt>{item.label}</dt>
						<dd>{item.description}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

function App() {
	const groups = buildGroups();
	const postTypeKey = Array.isArray(data.postTypeKey) ? data.postTypeKey : [];
	const techStack = Array.isArray(data.techStack) ? data.techStack : [];

	return (
		<div className="kpf-resources">
			<header className="kpf-resources-hero">
				<span>{__('Dashboard', 'kpf-core')}</span>
				<h1>{data.title || __('Resources', 'kpf-core')}</h1>
				<p>
					{data.description ||
						__(
							'Short how-tos for common Kevin Popke Foundation CMS tasks.',
							'kpf-core'
						)}
				</p>
			</header>

			{postTypeKey.length || techStack.length ? (
				<div className="kpf-resources-keys">
					<KeyCard
						description={__(
							'What each main content type is for — use this before opening a how-to card.',
							'kpf-core'
						)}
						items={postTypeKey}
						title={__('Post type key', 'kpf-core')}
						titleId="kpf-resources-post-type-key-title"
					/>
					<KeyCard
						description={__(
							'How the public site, CMS, and supporting services fit together.',
							'kpf-core'
						)}
						items={techStack}
						title={__('Tech stack', 'kpf-core')}
						titleId="kpf-resources-tech-stack-title"
					/>
				</div>
			) : null}

			{groups.length ? (
				<div className="kpf-resources-topics">
					{groups.map((group) => (
						<TopicGroup group={group} key={group.id} />
					))}
				</div>
			) : (
				<p className="kpf-resources-empty">
					{__('No resource cards are available yet.', 'kpf-core')}
				</p>
			)}
		</div>
	);
}

const root = document.getElementById('kpf-resources-admin-root');
if (root) {
	createRoot(root).render(<App />);
}
