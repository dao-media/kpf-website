import { createRoot } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Activity,
	ArrowUpRight,
	BookHeart,
	Braces,
	CalendarDays,
	CheckCircle2,
	ChevronRight,
	Clock3,
	ExternalLink,
	FileClock,
	FilePlus2,
	FileText,
	Gauge,
	ImageUp,
	Images,
	Inbox,
	Newspaper,
	PanelsTopLeft,
	SearchCheck,
	SearchX,
	SquarePen,
} from 'lucide-react';
import './admin.scss';

const data = window.kpfDashboardAdmin || {};

const icons = {
	Activity,
	BookHeart,
	Braces,
	CalendarDays,
	FileClock,
	FilePlus2,
	FileText,
	Gauge,
	ImageUp,
	Images,
	Inbox,
	Newspaper,
	PanelsTopLeft,
	SearchCheck,
	SearchX,
	SquarePen,
};

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
	const Component = icons[name] || Activity;
	return <Component aria-hidden="true" size={size} strokeWidth={strokeWidth} />;
}

function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return __('Good morning', 'kpf-core');
	if (hour < 18) return __('Good afternoon', 'kpf-core');
	return __('Good evening', 'kpf-core');
}

function StatCard({ stat }) {
	return (
		<a className="kpf-dashboard-stat" href={stat.url}>
			<span className="kpf-dashboard-stat__icon">
				<Icon name={stat.icon} size={20} />
			</span>
			<span className="kpf-dashboard-stat__label">{stat.label}</span>
			<strong>{Number(stat.value || 0).toLocaleString()}</strong>
			<span className="kpf-dashboard-stat__detail">{stat.detail}</span>
			<ArrowUpRight className="kpf-dashboard-stat__arrow" aria-hidden="true" size={16} />
		</a>
	);
}

function SectionHeader({ eyebrow, title, action, actionLabel }) {
	return (
		<div className="kpf-dashboard-section-heading">
			<div>
				{eyebrow ? <span>{eyebrow}</span> : null}
				<h2>{title}</h2>
			</div>
			{action ? (
				<a href={action}>
					{actionLabel}
					<ChevronRight aria-hidden="true" size={15} />
				</a>
			) : null}
		</div>
	);
}

function QuickActions() {
	return (
		<section className="kpf-dashboard-panel kpf-dashboard-actions">
			<SectionHeader
				eyebrow={__('Create and manage', 'kpf-core')}
				title={__('Quick actions', 'kpf-core')}
			/>
			<div className="kpf-dashboard-actions__grid">
				{(data.actions || []).map((action) => (
					<a
						className={`kpf-dashboard-action is-${action.variant || 'default'}`}
						href={action.url}
						key={action.id}
					>
						<span className="kpf-dashboard-action__icon">
							<Icon name={action.icon} size={20} />
						</span>
						<span>
							<strong>{action.label}</strong>
							<small>{action.description}</small>
						</span>
						<ArrowUpRight aria-hidden="true" size={16} />
					</a>
				))}
			</div>
		</section>
	);
}

function HealthCards() {
	return (
		<section className="kpf-dashboard-panel">
			<SectionHeader
				eyebrow={__('Foundation website', 'kpf-core')}
				title={__('Site readiness', 'kpf-core')}
				action={data.links?.siteHealth}
				actionLabel={__('Site Health', 'kpf-core')}
			/>
			<div className="kpf-dashboard-health">
				{(data.health || []).map((item) => (
					<a className={`kpf-dashboard-health__item is-${item.status}`} href={item.url} key={item.id}>
						<div className="kpf-dashboard-health__top">
							<span className="kpf-dashboard-health__icon">
								<Icon name={item.icon} size={19} />
							</span>
							<ArrowUpRight aria-hidden="true" size={15} />
						</div>
						<span>{item.label}</span>
						<strong>{item.value}</strong>
						<small>{item.description}</small>
						<div className="kpf-dashboard-progress" aria-hidden="true">
							<span style={{ width: `${Math.max(4, Number(item.progress || 0))}%` }} />
						</div>
					</a>
				))}
			</div>
		</section>
	);
}

function ContentIcon({ item }) {
	if (item.thumbnail) {
		return <img alt="" src={item.thumbnail} />;
	}
	const icon = item.type?.toLowerCase().includes('scrapbook')
		? 'BookHeart'
		: item.type?.toLowerCase().includes('blog')
			? 'Newspaper'
			: 'FileText';
	return <Icon name={icon} size={17} />;
}

function RecentContent() {
	return (
		<section className="kpf-dashboard-panel kpf-dashboard-recent">
			<SectionHeader
				eyebrow={__('Editorial overview', 'kpf-core')}
				title={__('Recently updated', 'kpf-core')}
				action={data.links?.allContent}
				actionLabel={__('All pages', 'kpf-core')}
			/>
			{data.recent?.length ? (
				<div className="kpf-dashboard-table" role="table" aria-label={__('Recently updated content', 'kpf-core')}>
					<div className="kpf-dashboard-table__header" role="row">
						<span role="columnheader">{__('Content', 'kpf-core')}</span>
						<span role="columnheader">{__('Type', 'kpf-core')}</span>
						<span role="columnheader">{__('Status', 'kpf-core')}</span>
						<span role="columnheader">{__('Updated', 'kpf-core')}</span>
						<span aria-hidden="true" />
					</div>
					{data.recent.map((item) => (
						<a className="kpf-dashboard-table__row" href={item.url} key={item.id} role="row">
							<span className="kpf-dashboard-content-title" role="cell">
								<span className="kpf-dashboard-content-icon">
									<ContentIcon item={item} />
								</span>
								<strong>{item.title}</strong>
							</span>
							<span role="cell">{item.type}</span>
							<span role="cell">
								<em className={`is-${item.statusKey}`}>{item.status}</em>
							</span>
							<span role="cell">{item.modified}</span>
							<ArrowUpRight aria-hidden="true" size={15} />
						</a>
					))}
				</div>
			) : (
				<div className="kpf-dashboard-empty">
					<FileText aria-hidden="true" size={22} />
					<p>{__('No editable content was found.', 'kpf-core')}</p>
				</div>
			)}
		</section>
	);
}

function Calendar() {
	const calendar = data.calendar || {};
	const cells = [];
	for (let index = 0; index < Number(calendar.startsOn || 0); index += 1) cells.push(null);
	for (let day = 1; day <= Number(calendar.days || 0); day += 1) cells.push(day);
	const scheduledDays = new Set((calendar.scheduled || []).map((item) => Number(item.day)));

	return (
		<section className="kpf-dashboard-panel kpf-dashboard-calendar">
			<SectionHeader eyebrow={__('Publishing', 'kpf-core')} title={calendar.monthLabel || __('Calendar', 'kpf-core')} />
			<div className="kpf-dashboard-calendar__weekdays" aria-hidden="true">
				{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
					<span key={`${day}-${index}`}>{day}</span>
				))}
			</div>
			<div className="kpf-dashboard-calendar__grid">
				{cells.map((day, index) =>
					day ? (
						<span
							className={[
								day === Number(calendar.today) ? 'is-today' : '',
								scheduledDays.has(day) ? 'has-event' : '',
							].join(' ')}
							key={day}
						>
							{day}
						</span>
					) : (
						<span aria-hidden="true" key={`blank-${index}`} />
					)
				)}
			</div>
			<div className="kpf-dashboard-schedule">
				<div className="kpf-dashboard-schedule__title">
					<strong>{__('Scheduled', 'kpf-core')}</strong>
					<CalendarDays aria-hidden="true" size={16} />
				</div>
				{calendar.scheduled?.length ? (
					calendar.scheduled.slice(0, 4).map((item) => (
						<a href={item.url} key={item.id}>
							<span className="kpf-dashboard-schedule__date">{item.date}</span>
							<span>
								<strong>{item.title}</strong>
								<small>{item.time}</small>
							</span>
							<ArrowUpRight aria-hidden="true" size={14} />
						</a>
					))
				) : (
					<p>{__('Nothing is scheduled yet.', 'kpf-core')}</p>
				)}
			</div>
		</section>
	);
}

function Attention() {
	const items = data.attention || [];
	return (
		<section className="kpf-dashboard-panel kpf-dashboard-attention">
			<SectionHeader eyebrow={__('Review queue', 'kpf-core')} title={__('Needs attention', 'kpf-core')} />
			{items.length ? (
				<div className="kpf-dashboard-attention__list">
					{items.map((item) => (
						<a href={item.url} key={item.id}>
							<span>
								<Icon name={item.icon} size={17} />
							</span>
							<span>
								<strong>{item.label}</strong>
								<small>{item.description}</small>
							</span>
							<ChevronRight aria-hidden="true" size={16} />
						</a>
					))}
				</div>
			) : (
				<div className="kpf-dashboard-all-clear">
					<CheckCircle2 aria-hidden="true" size={22} />
					<div>
						<strong>{__('Everything looks clear', 'kpf-core')}</strong>
						<p>{__('There are no outstanding editorial checks.', 'kpf-core')}</p>
					</div>
				</div>
			)}
		</section>
	);
}

function SystemLinks() {
	return (
		<section className="kpf-dashboard-panel kpf-dashboard-system">
			<div>
				<span className="kpf-dashboard-system__icon">
					<Gauge aria-hidden="true" size={19} />
				</span>
				<div>
					<strong>{__('Site operations', 'kpf-core')}</strong>
					<p>{__('Performance, health, and maintenance tools.', 'kpf-core')}</p>
				</div>
			</div>
			<nav aria-label={__('Site operations', 'kpf-core')}>
				<a href={data.links?.performance}>
					{__('Performance', 'kpf-core')}
					<ChevronRight aria-hidden="true" size={15} />
				</a>
				<a href={data.links?.siteHealth}>
					{__('Site Health', 'kpf-core')}
					<ChevronRight aria-hidden="true" size={15} />
				</a>
			</nav>
		</section>
	);
}

function App() {
	return (
		<div className="kpf-dashboard">
			<header className="kpf-dashboard-hero">
				<div className="kpf-dashboard-hero__copy">
					<span>
						<Clock3 aria-hidden="true" size={14} />
						{data.site?.date}
					</span>
					<h1>
						{greeting()}, {data.user?.name}
					</h1>
					<p>
						{data.site?.description ||
							sprintf(__('Manage content, design, and site health for %s.', 'kpf-core'), data.site?.name || '')}
					</p>
				</div>
				<div className="kpf-dashboard-hero__actions">
					<a className="kpf-dashboard-button is-secondary" href={data.site?.url} rel="noreferrer" target="_blank">
						{__('View site', 'kpf-core')}
						<ExternalLink aria-hidden="true" size={16} />
					</a>
					{data.actions?.[0] ? (
						<a className="kpf-dashboard-button is-primary" href={data.actions[0].url}>
							<FilePlus2 aria-hidden="true" size={17} />
							{__('Create new page', 'kpf-core')}
						</a>
					) : null}
				</div>
			</header>

			<div className="kpf-dashboard-stats">
				{(data.stats || []).map((stat) => (
					<StatCard key={stat.id} stat={stat} />
				))}
			</div>

			<div className="kpf-dashboard-layout">
				<main>
					<QuickActions />
					<HealthCards />
					<RecentContent />
				</main>
				<aside>
					<Calendar />
					<Attention />
					<SystemLinks />
				</aside>
			</div>
		</div>
	);
}

const rootElement = document.getElementById('kpf-admin-dashboard-root');
if (rootElement) {
	createRoot(rootElement).render(<App />);
}
