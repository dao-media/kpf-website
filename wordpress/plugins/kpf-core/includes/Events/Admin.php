<?php

declare(strict_types=1);

namespace KPF\Core\Events;

use WP_Post;
use WP_Query;

final class Admin {
	public static function register(): void {
		add_filter(
			'manage_' . ContentType::POST_TYPE . '_posts_columns',
			array( self::class, 'columns' )
		);
		add_action(
			'manage_' . ContentType::POST_TYPE . '_posts_custom_column',
			array( self::class, 'render_column' ),
			10,
			2
		);
		add_filter(
			'manage_edit-' . ContentType::POST_TYPE . '_sortable_columns',
			array( self::class, 'sortable_columns' )
		);
		add_action('pre_get_posts', array( self::class, 'apply_list_query' ));
		add_filter(
			'enter_title_here',
			static function (string $title, WP_Post $post): string {
				return ContentType::POST_TYPE === $post->post_type
					? __('Event name', 'kpf-core')
					: $title;
			},
			10,
			2
		);
		add_action(
			ContentType::PARTNER_TAXONOMY . '_add_form_fields',
			array( self::class, 'partner_add_logo_field' )
		);
		add_action(
			ContentType::PARTNER_TAXONOMY . '_edit_form_fields',
			array( self::class, 'partner_edit_logo_field' )
		);
		add_action(
			'created_' . ContentType::PARTNER_TAXONOMY,
			array( self::class, 'save_partner_logo' )
		);
		add_action(
			'edited_' . ContentType::PARTNER_TAXONOMY,
			array( self::class, 'save_partner_logo' )
		);
		add_action('admin_enqueue_scripts', array( self::class, 'enqueue_partner_media' ));
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns(array $columns): array {
		return array(
			'cb'                => $columns['cb'] ?? '<input type="checkbox" />',
			'title'             => __('Event', 'kpf-core'),
			'kpf_event_when'    => __('When', 'kpf-core'),
			'kpf_event_where'   => __('Indoor / outdoor', 'kpf-core'),
			'kpf_event_recur'   => __('Recurring', 'kpf-core'),
			ContentType::LIVE_TAXONOMY => __('Live events', 'kpf-core'),
			'date'              => $columns['date'] ?? __('Published', 'kpf-core'),
		);
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function sortable_columns(array $columns): array {
		$columns['kpf_event_when'] = 'kpf_event_start';
		return $columns;
	}

	public static function render_column(string $column, int $post_id): void {
		$meta = Meta::get($post_id);

		switch ($column) {
			case 'kpf_event_when':
				$start = (string) $meta['start_date'];
				$end   = (string) $meta['end_date'];
				$time  = trim((string) $meta['start_time'] . ( $meta['end_time'] ? '–' . $meta['end_time'] : '' ));
				$label = $start ?: '—';
				if ($end && $end !== $start) {
					$label .= ' → ' . $end;
				}
				if ($time) {
					$label .= ' · ' . $time;
				}
				echo esc_html($label);
				break;
			case 'kpf_event_where':
				$map = array(
					'indoor'  => __('Indoor', 'kpf-core'),
					'outdoor' => __('Outdoor', 'kpf-core'),
					'both'    => __('Indoor & outdoor', 'kpf-core'),
					'tbd'     => __('TBD', 'kpf-core'),
				);
				echo esc_html($map[ $meta['location_type'] ] ?? __('TBD', 'kpf-core'));
				break;
			case 'kpf_event_recur':
				echo ! empty($meta['is_recurring'])
					? esc_html(ucfirst((string) ($meta['recurrence']['frequency'] ?? 'yes')))
					: '<span aria-hidden="true">—</span>';
				break;
		}
	}

	public static function apply_list_query(WP_Query $query): void {
		if (! is_admin() || ! $query->is_main_query()) {
			return;
		}

		$post_type = $query->get('post_type');
		if (ContentType::POST_TYPE !== $post_type) {
			return;
		}

		if ('kpf_event_start' === $query->get('orderby')) {
			$query->set('meta_key', Meta::START_DATE_META);
			$query->set('orderby', 'meta_value');
		}

		$view = isset($_GET['kpf_event_view']) ? sanitize_key((string) wp_unslash($_GET['kpf_event_view'])) : '';
		if ('' === $view) {
			return;
		}

		$today = gmdate('Y-m-d');
		$meta_query = is_array($query->get('meta_query')) ? $query->get('meta_query') : array();

		switch ($view) {
			case 'upcoming':
				$meta_query[] = array(
					'key'     => Meta::END_DATE_META,
					'value'   => $today,
					'compare' => '>=',
					'type'    => 'DATE',
				);
				break;
			case 'past':
				$meta_query[] = array(
					'key'     => Meta::END_DATE_META,
					'value'   => $today,
					'compare' => '<',
					'type'    => 'DATE',
				);
				break;
			case 'recurring':
				$meta_query[] = array(
					'key'   => Meta::IS_RECURRING_META,
					'value' => '1',
				);
				break;
		}

		if ($meta_query) {
			$query->set('meta_query', $meta_query);
		}
	}

	public static function partner_add_logo_field(): void {
		?>
		<div class="form-field term-group">
			<label for="kpf-partner-logo"><?php esc_html_e('Logo', 'kpf-core'); ?></label>
			<input type="hidden" id="kpf-partner-logo" name="kpf_partner_logo" value="" />
			<button type="button" class="button kpf-partner-logo-upload"><?php esc_html_e('Choose logo', 'kpf-core'); ?></button>
			<button type="button" class="button kpf-partner-logo-clear" style="display:none;"><?php esc_html_e('Remove', 'kpf-core'); ?></button>
			<p class="kpf-partner-logo-preview" style="margin-top:8px;"></p>
		</div>
		<?php
	}

	public static function partner_edit_logo_field(\WP_Term $term): void {
		$logo_id = (int) get_term_meta($term->term_id, ContentType::PARTNER_LOGO_META, true);
		$url     = $logo_id > 0 ? wp_get_attachment_image_url($logo_id, 'thumbnail') : '';
		?>
		<tr class="form-field term-group-wrap">
			<th scope="row"><label for="kpf-partner-logo"><?php esc_html_e('Logo', 'kpf-core'); ?></label></th>
			<td>
				<input type="hidden" id="kpf-partner-logo" name="kpf_partner_logo" value="<?php echo esc_attr((string) $logo_id); ?>" />
				<button type="button" class="button kpf-partner-logo-upload"><?php esc_html_e('Choose logo', 'kpf-core'); ?></button>
				<button type="button" class="button kpf-partner-logo-clear" <?php echo $logo_id ? '' : 'style="display:none;"'; ?>><?php esc_html_e('Remove', 'kpf-core'); ?></button>
				<p class="kpf-partner-logo-preview" style="margin-top:8px;">
					<?php if ($url) : ?>
						<img src="<?php echo esc_url($url); ?>" alt="" style="max-width:96px;height:auto;" />
					<?php endif; ?>
				</p>
			</td>
		</tr>
		<?php
	}

	public static function save_partner_logo(int $term_id): void {
		if (! current_user_can('edit_posts')) {
			return;
		}
		if (! isset($_POST['kpf_partner_logo'])) {
			return;
		}
		$logo_id = absint(wp_unslash($_POST['kpf_partner_logo']));
		if ($logo_id > 0) {
			update_term_meta($term_id, ContentType::PARTNER_LOGO_META, $logo_id);
		} else {
			delete_term_meta($term_id, ContentType::PARTNER_LOGO_META);
		}
	}

	public static function enqueue_partner_media(string $hook): void {
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;
		if (! $screen || ContentType::PARTNER_TAXONOMY !== ($screen->taxonomy ?? '')) {
			return;
		}

		wp_enqueue_media();
		wp_add_inline_script(
			'jquery',
			<<<'JS'
jQuery(function ($) {
	var frame;
	function bind() {
		$('.kpf-partner-logo-upload').off('click.kpf').on('click.kpf', function (e) {
			e.preventDefault();
			if (frame) { frame.open(); return; }
			frame = wp.media({ title: 'Choose logo', button: { text: 'Use logo' }, multiple: false });
			frame.on('select', function () {
				var attachment = frame.state().get('selection').first().toJSON();
				$('#kpf-partner-logo').val(attachment.id);
				$('.kpf-partner-logo-preview').html('<img src="' + (attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url) + '" alt="" style="max-width:96px;height:auto;" />');
				$('.kpf-partner-logo-clear').show();
			});
			frame.open();
		});
		$('.kpf-partner-logo-clear').off('click.kpf').on('click.kpf', function (e) {
			e.preventDefault();
			$('#kpf-partner-logo').val('');
			$('.kpf-partner-logo-preview').empty();
			$(this).hide();
		});
	}
	bind();
});
JS
		);
	}
}
