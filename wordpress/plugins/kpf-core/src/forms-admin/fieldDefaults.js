export const FIELD_TYPES =
	window.kpfFormsAdmin?.fieldTypes ||
	[
		{ id: 'short_text', label: 'Short text', group: 'inputs', defaultWidth: 'half' },
		{ id: 'long_text', label: 'Long text', group: 'inputs', defaultWidth: 'full' },
		{ id: 'email', label: 'Email', group: 'inputs', defaultWidth: 'half' },
		{ id: 'tel', label: 'Telephone', group: 'inputs', defaultWidth: 'half' },
		{ id: 'number', label: 'Number', group: 'inputs', defaultWidth: 'half' },
		{ id: 'url', label: 'URL / link', group: 'inputs', defaultWidth: 'half' },
		{ id: 'password', label: 'Password', group: 'inputs', defaultWidth: 'half' },
		{ id: 'hidden', label: 'Hidden', group: 'inputs', defaultWidth: 'full' },
		{ id: 'select', label: 'Dropdown', group: 'choice', defaultWidth: 'half' },
		{ id: 'multiselect', label: 'Multi-select', group: 'choice', defaultWidth: 'full' },
		{ id: 'radio', label: 'Multiple choice', group: 'choice', defaultWidth: 'full' },
		{ id: 'checkbox', label: 'Checkbox', group: 'choice', defaultWidth: 'full' },
		{ id: 'checkbox_group', label: 'Checkbox group', group: 'choice', defaultWidth: 'full' },
		{ id: 'toggle', label: 'Toggle', group: 'choice', defaultWidth: 'half' },
		{ id: 'ranking', label: 'Ranking', group: 'choice', defaultWidth: 'full' },
		{ id: 'date', label: 'Date', group: 'pickers', defaultWidth: 'half' },
		{ id: 'time', label: 'Time', group: 'pickers', defaultWidth: 'half' },
		{ id: 'datetime', label: 'Date & time', group: 'pickers', defaultWidth: 'half' },
		{ id: 'city_state', label: 'City + state', group: 'special', defaultWidth: 'full' },
		{ id: 'file', label: 'File upload', group: 'special', defaultWidth: 'full' },
		{ id: 'social', label: 'Social profile', group: 'special', defaultWidth: 'half' },
		{ id: 'html', label: 'Content block', group: 'special', defaultWidth: 'full' },
		{ id: 'divider', label: 'Divider', group: 'special', defaultWidth: 'full' },
		{ id: 'captcha', label: 'Captcha', group: 'special', defaultWidth: 'full' },
	];

export function uid(prefix = 'id') {
	return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyDefinition() {
	const nameId = uid('field');
	const emailId = uid('field');
	const messageId = uid('field');
	const rowTwo = uid('row');
	const rowOne = uid('row');
	return {
		version: 1,
		status: 'active',
		settings: {
			submitLabel: 'Send message',
			successMessage: 'Thank you. Your message has been received.',
			successDisplay: 'inline',
			redirectUrl: '',
			inboxFormName: 'Contact form',
			notificationEmails: [],
			notifications: {
				enabled: true,
				emails: [],
				subject: '',
			},
			receipt: {
				enabled: false,
				subject: '',
				message:
					'Thank you for contacting us. We received your message and will get back to you soon.\n\n— {site}',
			},
			webhooks: [],
			captchaMode: 'honeypot',
			analytics: { eventName: 'kpf_form_submit', formTag: '' },
		},
		rows: [
			{
				id: rowTwo,
				columns: 2,
				slots: [[nameId], [emailId]],
				fields: [nameId, emailId],
			},
			{
				id: rowOne,
				columns: 1,
				slots: [[messageId]],
				fields: [messageId],
			},
		],
		fields: {
			[nameId]: makeField(nameId, 'short_text', 'Name', 'name', 'half'),
			[emailId]: makeField(emailId, 'email', 'Email', 'email', 'half'),
			[messageId]: makeField(messageId, 'long_text', 'Message', 'message', 'full'),
		},
		conditions: [],
	};
}

export function makeField(id, type, label, name, width) {
	const meta = FIELD_TYPES.find((item) => item.id === type);
	return {
		id,
		type,
		label: label || meta?.label || type,
		name: name || id,
		placeholder: '',
		help: '',
		required: ['email', 'short_text', 'long_text'].includes(type),
		width: width || meta?.defaultWidth || 'full',
		options:
			['select', 'multiselect', 'radio', 'checkbox_group', 'ranking'].includes(type)
				? [
						{ label: 'Option A', value: 'a' },
						{ label: 'Option B', value: 'b' },
					]
				: [],
		validation: {},
		analyticsTag: '',
		defaultValue: '',
		html: type === 'html' ? '<p>Supporting copy</p>' : '',
		accept: type === 'file' ? '.pdf,.jpg,.png' : '',
		platform: 'x',
		countryDefault: 'US',
		conditions: [],
	};
}

export function emptyDraft() {
	return {
		id: 0,
		title: '',
		slug: '',
		status: 'publish',
		definition: emptyDefinition(),
	};
}

export function slugify(value) {
	return String(value || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

/**
 * Field name/key sanitizer. Allows hyphens and underscores, and does not
 * strip trailing separators (so users can type them).
 */
export function sanitizeFieldKey(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '')
		.slice(0, 80);
}
