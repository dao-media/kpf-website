import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	ArrowUpRight,
	BookHeart,
	ExternalLink,
	Users,
} from 'lucide-react';
import './admin.scss';

const data = window.kpfResourcesAdmin || {};

const icons = {
	BookHeart,
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

function App() {
	const cards = Array.isArray(data.cards) ? data.cards : [];

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

			{cards.length ? (
				<div className="kpf-resources-grid">
					{cards.map((card) => (
						<Card card={card} key={card.id} />
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
