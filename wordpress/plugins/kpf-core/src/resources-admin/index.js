import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ArrowUpRight,
	BookHeart,
	ExternalLink,
	PencilLine,
	Users,
} from 'lucide-react';
import './admin.scss';

const data = window.kpfResourcesAdmin || {};

const icons = {
	BookHeart,
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

function Card({ card }) {
	return (
		<article className="kpf-resources-card" id={`kpf-resource-${card.id}`}>
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

function App() {
	const groups = buildGroups();

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
