export function Section({ title, description, children, className = '' }) {
	return (
		<section className={`kpf-perf-section ${className}`.trim()}>
			{(title || description) && (
				<header className="kpf-perf-section__header">
					{title ? <h2>{title}</h2> : null}
					{description ? <p>{description}</p> : null}
				</header>
			)}
			<div className="kpf-perf-section__body">{children}</div>
		</section>
	);
}

export function FieldGroup({ title, help, children }) {
	return (
		<div className="kpf-perf-field-group">
			{title ? <h3 className="kpf-perf-field-group__title">{title}</h3> : null}
			{help ? <p className="kpf-perf-field-group__help">{help}</p> : null}
			{children}
		</div>
	);
}

export function Stat({ label, value }) {
	return (
		<div className="kpf-perf-stat">
			<p className="kpf-perf-stat__label">{label}</p>
			<p className="kpf-perf-stat__value">{value}</p>
		</div>
	);
}
