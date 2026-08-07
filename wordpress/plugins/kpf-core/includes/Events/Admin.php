<?php

declare(strict_types=1);

namespace KPF\Core\Events;

use WP_Post;

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
		add_action( 'add_meta_boxes', array( self::class, 'remove_host_metabox' ), 40 );
		add_filter(
			'enter_title_here',
			static function ( string $title, WP_Post $post ): string {
				return ContentType::POST_TYPE === $post->post_type
					? __( 'Event title', 'kpf-core' )
					: $title;
			},
			10,
			2
		);
		add_action(
			ContentType::HOST_TAXONOMY . '_add_form_fields',
			array( self::class, 'host_add_logo_field' )
		);
		add_action(
			ContentType::HOST_TAXONOMY . '_edit_form_fields',
			array( self::class, 'host_edit_logo_field' )
		);
		add_action(
			'created_' . ContentType::HOST_TAXONOMY,
			array( self::class, 'save_host_logo' )
		);
		add_action(
			'edited_' . ContentType::HOST_TAXONOMY,
			array( self::class, 'save_host_logo' )
		);
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_host_media' ) );
		add_filter(
			'manage_edit-' . ContentType::HOST_TAXONOMY . '_columns',
			array( self::class, 'host_columns' )
		);
		add_filter(
			'manage_' . ContentType::HOST_TAXONOMY . '_custom_column',
			array( self::class, 'render_host_column' ),
			10,
			3
		);
	}

	public static function remove_host_metabox(): void {
		remove_meta_box( ContentType::HOST_TAXONOMY . 'div', ContentType::POST_TYPE, 'side' );
		remove_meta_box( 'tagsdiv-' . ContentType::HOST_TAXONOMY, ContentType::POST_TYPE, 'side' );
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function host_columns( array $columns ): array {
		$out = array();
		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;
			if ( 'name' === $key ) {
				$out['kpf_host_logo'] = __( 'Logo', 'kpf-core' );
			}
		}
		return $out;
	}

	public static function render_host_column( string $content, string $column, int $term_id ): string {
		if ( 'kpf_host_logo' !== $column ) {
			return $content;
		}
		$logo_id = (int) get_term_meta( $term_id, ContentType::HOST_LOGO_META, true );
		if ( $logo_id < 1 ) {
			return '—';
		}
		$image = wp_get_attachment_image(
			$logo_id,
			array( 40, 40 ),
			false,
			array(
				'style' => 'width:40px;height:40px;object-fit:contain;border-radius:4px;background:#f6f7f7;',
			)
		);
		return is_string( $image ) && '' !== $image ? $image : '—';
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns( array $columns ): array {
		return array(
			'cb'            => $columns['cb'] ?? '<input type="checkbox" />',
			'title'         => __( 'Event', 'kpf-core' ),
			'kpf_hosts'     => __( 'Hosts', 'kpf-core' ),
			'kpf_when'      => __( 'When', 'kpf-core' ),
			'kpf_location'  => __( 'Location', 'kpf-core' ),
			'kpf_logline'   => __( 'Logline', 'kpf-core' ),
			'date'          => $columns['date'] ?? __( 'Published', 'kpf-core' ),
		);
	}

	public static function render_column( string $column, int $post_id ): void {
		$meta = Meta::get( $post_id );

		switch ( $column ) {
			case 'kpf_hosts':
				$names = array();
				foreach ( $meta['host_term_ids'] as $term_id ) {
					$term = get_term( (int) $term_id, ContentType::HOST_TAXONOMY );
					if ( $term && ! is_wp_error( $term ) ) {
						$names[] = $term->name;
					}
				}
				echo $names
					? esc_html( implode( ', ', $names ) )
					: '<span aria-hidden="true">—</span>';
				break;
			case 'kpf_when':
				$label = Meta::format_schedule_label( $meta );
				echo $label !== '' ? esc_html( $label ) : '<span aria-hidden="true">—</span>';
				break;
			case 'kpf_location':
				$label = Meta::format_location_label( $meta );
				$maps  = Meta::location_maps_url( $meta );
				if ( '' === $label ) {
					echo '<span aria-hidden="true">—</span>';
					break;
				}
				if ( '' !== $maps ) {
					printf(
						'<a href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a>',
						esc_url( $maps ),
						esc_html( $label )
					);
					break;
				}
				echo esc_html( $label );
				break;
			case 'kpf_logline':
				$logline = (string) ( $meta['logline'] ?? '' );
				if ( '' === $logline ) {
					echo '<span aria-hidden="true">—</span>';
					break;
				}
				echo esc_html( wp_html_excerpt( $logline, 60, '…' ) );
				break;
		}
	}

	public static function host_add_logo_field(): void {
		?>
		<div class="form-field term-group">
			<label for="kpf-host-logo"><?php esc_html_e( 'Logo', 'kpf-core' ); ?></label>
			<input type="hidden" id="kpf-host-logo" name="kpf_host_logo" value="" />
			<button type="button" class="button kpf-host-logo-upload"><?php esc_html_e( 'Choose logo', 'kpf-core' ); ?></button>
			<button type="button" class="button kpf-host-logo-clear" style="display:none;"><?php esc_html_e( 'Remove', 'kpf-core' ); ?></button>
			<p class="kpf-host-logo-preview" style="margin-top:8px;"></p>
		</div>
		<?php
	}

	public static function host_edit_logo_field( \WP_Term $term ): void {
		$logo_id = (int) get_term_meta( $term->term_id, ContentType::HOST_LOGO_META, true );
		$url     = $logo_id > 0 ? wp_get_attachment_image_url( $logo_id, 'thumbnail' ) : '';
		?>
		<tr class="form-field term-group-wrap">
			<th scope="row"><label for="kpf-host-logo"><?php esc_html_e( 'Logo', 'kpf-core' ); ?></label></th>
			<td>
				<input type="hidden" id="kpf-host-logo" name="kpf_host_logo" value="<?php echo esc_attr( (string) $logo_id ); ?>" />
				<button type="button" class="button kpf-host-logo-upload"><?php esc_html_e( 'Choose logo', 'kpf-core' ); ?></button>
				<button type="button" class="button kpf-host-logo-clear" <?php echo $logo_id ? '' : 'style="display:none;"'; ?>><?php esc_html_e( 'Remove', 'kpf-core' ); ?></button>
				<p class="kpf-host-logo-preview" style="margin-top:8px;">
					<?php if ( $url ) : ?>
						<img src="<?php echo esc_url( $url ); ?>" alt="" style="max-width:96px;height:auto;" />
					<?php endif; ?>
				</p>
			</td>
		</tr>
		<?php
	}

	public static function save_host_logo( int $term_id ): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		if ( ! isset( $_POST['kpf_host_logo'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			return;
		}
		$logo_id = absint( wp_unslash( $_POST['kpf_host_logo'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		if ( $logo_id > 0 ) {
			update_term_meta( $term_id, ContentType::HOST_LOGO_META, $logo_id );
		} else {
			delete_term_meta( $term_id, ContentType::HOST_LOGO_META );
		}
	}

	public static function enqueue_host_media( string $hook ): void {
		unset( $hook );
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::HOST_TAXONOMY !== ( $screen->taxonomy ?? '' ) ) {
			return;
		}

		wp_enqueue_media();
		wp_add_inline_script(
			'jquery',
			<<<'JS'
jQuery(function ($) {
	var frame;
	function bind() {
		$('.kpf-host-logo-upload').off('click.kpf').on('click.kpf', function (e) {
			e.preventDefault();
			if (frame) { frame.open(); return; }
			frame = wp.media({ title: 'Choose logo', button: { text: 'Use logo' }, multiple: false });
			frame.on('select', function () {
				var attachment = frame.state().get('selection').first().toJSON();
				$('#kpf-host-logo').val(attachment.id);
				$('.kpf-host-logo-preview').html('<img src="' + (attachment.sizes && attachment.sizes.thumbnail ? attachment.sizes.thumbnail.url : attachment.url) + '" alt="" style="max-width:96px;height:auto;" />');
				$('.kpf-host-logo-clear').show();
			});
			frame.open();
		});
		$('.kpf-host-logo-clear').off('click.kpf').on('click.kpf', function (e) {
			e.preventDefault();
			$('#kpf-host-logo').val('');
			$('.kpf-host-logo-preview').empty();
			$(this).hide();
		});
	}
	bind();
});
JS
		);
	}
}
