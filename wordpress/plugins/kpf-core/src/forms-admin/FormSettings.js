import {
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { slugify } from './fieldDefaults';

const CAPTCHA_CHOICES = (
	window.kpfFormsAdmin?.captcha?.choices ||
	(window.kpfFormsAdmin?.captchaModes || ['honeypot', 'off']).map((mode) => ({
		value: mode,
		label: mode,
		available: true,
	}))
).filter((choice) => choice.available !== false);

function listToCsv(list) {
	return (Array.isArray(list) ? list : []).join(', ');
}

function csvToList(value) {
	return String(value || '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

export default function FormSettings({ draft, onChange, definition, patchDefinition, patchSettings }) {
	const settings = definition.settings || {};
	const notifications = settings.notifications || {
		enabled: true,
		emails: settings.notificationEmails || [],
		subject: '',
	};
	const receipt = settings.receipt || {
		enabled: false,
		subject: '',
		message: '',
	};

	function patchNotifications(patch) {
		const next = { ...notifications, ...patch };
		if (Object.prototype.hasOwnProperty.call(patch, 'emails')) {
			patchSettings({
				notifications: next,
				notificationEmails: next.emails || [],
			});
			return;
		}
		patchSettings({ notifications: next });
	}

	function patchReceipt(patch) {
		patchSettings({ receipt: { ...receipt, ...patch } });
	}

	return (
		<div className="kpf-forms-settings">
			<section className="kpf-forms-settings__section">
				<h2>{__('Form', 'kpf-core')}</h2>
				<p className="description">
					{__('Identity and status for this form.', 'kpf-core')}
				</p>
				<div className="kpf-forms-settings__grid">
					<TextControl
						label={__('Form name', 'kpf-core')}
						value={draft.title}
						onChange={(title) =>
							onChange({
								...draft,
								title,
								slug: draft.id ? draft.slug : slugify(title),
							})
						}
						help={__('Shown in the forms list and used as the default inbox label.', 'kpf-core')}
					/>
					<TextControl
						label={__('Slug', 'kpf-core')}
						value={draft.slug}
						onChange={(slug) => onChange({ ...draft, slug: slugify(slug) })}
						help={draft.slug ? `{{form:${draft.slug}}}` : __('Used in the embed token.', 'kpf-core')}
					/>
					<SelectControl
						label={__('Status', 'kpf-core')}
						value={definition.status || 'active'}
						options={[
							{ label: __('Active', 'kpf-core'), value: 'active' },
							{ label: __('Inactive', 'kpf-core'), value: 'inactive' },
						]}
						onChange={(status) => patchDefinition({ status })}
					/>
					<TextControl
						label={__('Inbox form name', 'kpf-core')}
						value={settings.inboxFormName || ''}
						onChange={(inboxFormName) => patchSettings({ inboxFormName })}
						help={__('Label on Inbox → Forms submissions.', 'kpf-core')}
					/>
					<TextControl
						label={__('Submit button label', 'kpf-core')}
						value={settings.submitLabel || ''}
						onChange={(submitLabel) => patchSettings({ submitLabel })}
					/>
				</div>
			</section>

			<section className="kpf-forms-settings__section">
				<h2>{__('After submit', 'kpf-core')}</h2>
				<p className="description">
					{__('How visitors see confirmation, and whether they are redirected.', 'kpf-core')}
				</p>
				<div className="kpf-forms-settings__grid">
					<TextareaControl
						label={__('Success message', 'kpf-core')}
						value={settings.successMessage || ''}
						onChange={(successMessage) => patchSettings({ successMessage })}
						rows={3}
					/>
					<SelectControl
						label={__('Success display', 'kpf-core')}
						value={settings.successDisplay || 'inline'}
						options={[
							{ label: __('Inline (below the form)', 'kpf-core'), value: 'inline' },
							{ label: __('Toast notification', 'kpf-core'), value: 'toast' },
							{ label: __('Modal dialog', 'kpf-core'), value: 'modal' },
						]}
						onChange={(successDisplay) => patchSettings({ successDisplay })}
					/>
					<TextControl
						label={__('Redirect URL', 'kpf-core')}
						value={settings.redirectUrl || ''}
						onChange={(redirectUrl) => patchSettings({ redirectUrl })}
						help={__(
							'Optional. After a successful submit the visitor is sent here. Leave blank to stay on the page.',
							'kpf-core'
						)}
						type="url"
					/>
				</div>
			</section>

			<section className="kpf-forms-settings__section">
				<h2>{__('Notifications', 'kpf-core')}</h2>
				<p className="description">
					{__(
						'Email your team when this form is submitted. Separate from the global Inbox notification toggle.',
						'kpf-core'
					)}
				</p>
				<ToggleControl
					label={__('Send staff notification emails', 'kpf-core')}
					checked={!!notifications.enabled}
					onChange={(enabled) => patchNotifications({ enabled })}
				/>
				{notifications.enabled && (
					<div className="kpf-forms-settings__grid">
						<TextControl
							label={__('Notification emails', 'kpf-core')}
							value={listToCsv(notifications.emails)}
							onChange={(value) => patchNotifications({ emails: csvToList(value) })}
							help={__('Comma-separated. Reply-To is set to the submitter when available.', 'kpf-core')}
						/>
						<TextControl
							label={__('Subject (optional)', 'kpf-core')}
							value={notifications.subject || ''}
							onChange={(subject) => patchNotifications({ subject })}
							help={__('Leave blank for the default “[Site] New submission: Form name”.', 'kpf-core')}
						/>
					</div>
				)}
			</section>

			<section className="kpf-forms-settings__section">
				<h2>{__('Receipt', 'kpf-core')}</h2>
				<p className="description">
					{__(
						'Send an automatic confirmation email to the person who submitted the form. Requires an email field value.',
						'kpf-core'
					)}
				</p>
				<ToggleControl
					label={__('Send receipt to submitter', 'kpf-core')}
					checked={!!receipt.enabled}
					onChange={(enabled) => patchReceipt({ enabled })}
				/>
				{receipt.enabled && (
					<div className="kpf-forms-settings__grid">
						<TextControl
							label={__('Receipt subject', 'kpf-core')}
							value={receipt.subject || ''}
							onChange={(subject) => patchReceipt({ subject })}
							help={__('Leave blank for the default confirmation subject.', 'kpf-core')}
						/>
						<TextareaControl
							label={__('Receipt message', 'kpf-core')}
							value={receipt.message || ''}
							onChange={(message) => patchReceipt({ message })}
							rows={6}
							help={__(
								'Placeholders: {name}, {email}, {form}, {message}, {site}',
								'kpf-core'
							)}
						/>
					</div>
				)}
			</section>

			<section className="kpf-forms-settings__section">
				<h2>{__('Spam protection', 'kpf-core')}</h2>
				<div className="kpf-forms-settings__grid">
					<SelectControl
						label={__('Captcha', 'kpf-core')}
						value={
							CAPTCHA_CHOICES.some(
								(choice) => choice.value === (settings.captchaMode || 'honeypot')
							)
								? settings.captchaMode || 'honeypot'
								: 'honeypot'
						}
						options={CAPTCHA_CHOICES.map((choice) => ({
							label: choice.label || choice.value,
							value: choice.value,
						}))}
						onChange={(captchaMode) => patchSettings({ captchaMode })}
						help={__(
							'Honeypot is invisible. Turnstile / reCAPTCHA appear only when keys are configured in Forms → Settings.',
							'kpf-core'
						)}
					/>
				</div>
				{CAPTCHA_CHOICES.filter((choice) =>
					['turnstile', 'recaptcha'].includes(choice.value)
				).length === 0 && (
					<p className="description">
						{__('No challenge captcha providers configured yet.', 'kpf-core')}{' '}
						{window.kpfFormsAdmin?.captcha?.settingsUrl ? (
							<a href={window.kpfFormsAdmin.captcha.settingsUrl}>
								{__('Open Forms settings', 'kpf-core')}
							</a>
						) : null}
					</p>
				)}
			</section>

			<section className="kpf-forms-settings__section">
				<h2>{__('Integrations & analytics', 'kpf-core')}</h2>
				<div className="kpf-forms-settings__grid">
					<TextControl
						label={__('Webhook URLs', 'kpf-core')}
						value={listToCsv(settings.webhooks)}
						onChange={(value) => patchSettings({ webhooks: csvToList(value) })}
						help={__('Comma-separated. Each URL receives a JSON POST on submit.', 'kpf-core')}
					/>
					<TextControl
						label={__('Analytics event name', 'kpf-core')}
						value={settings.analytics?.eventName || ''}
						onChange={(eventName) =>
							patchSettings({
								analytics: {
									...(settings.analytics || {}),
									eventName,
								},
							})
						}
					/>
					<TextControl
						label={__('Analytics form tag', 'kpf-core')}
						value={settings.analytics?.formTag || ''}
						onChange={(formTag) =>
							patchSettings({
								analytics: {
									...(settings.analytics || {}),
									formTag,
								},
							})
						}
					/>
				</div>
			</section>

			<div className="kpf-forms-settings__footer">
				<p className="description" style={{ margin: 0 }}>
					{__('Switch to the Builder tab to edit fields and layout.', 'kpf-core')}
				</p>
			</div>
		</div>
	);
}
