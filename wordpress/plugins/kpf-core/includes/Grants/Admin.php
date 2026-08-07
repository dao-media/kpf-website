<?php

declare(strict_types=1);

namespace KPF\Core\Grants;

use KPF\Core\Grantees\ContentType as GranteeContentType;
use WP_Post;
use WP_Query;

final class Admin {
	private const NONCE_ACTION = 'kpf_grant_details_save';
	private const NONCE_NAME   = 'kpf_grant_details_nonce';

	public static function register(): void {
		add_filter(
			'use_block_editor_for_post_type',
			array( self::class, 'disable_block_editor' ),
			10,
			2
		);
		add_action( 'add_meta_boxes', array( self::class, 'meta_boxes' ) );
		add_action(
			'save_post_' . ContentType::POST_TYPE,
			array( self::class, 'save' ),
			10,
			2
		);
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
		add_action( 'pre_get_posts', array( self::class, 'apply_sorting' ) );
		add_action( 'edit_form_after_title', array( self::class, 'editor_intro' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue_assets' ) );
		add_action( 'admin_head', array( self::class, 'hide_title_field' ) );
	}

	/**
	 * @param bool   $use
	 * @param string $post_type
	 */
	public static function disable_block_editor( bool $use, string $post_type ): bool {
		if ( ContentType::POST_TYPE === $post_type ) {
			return false;
		}
		return $use;
	}

	public static function hide_title_field(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::POST_TYPE !== ( $screen->post_type ?? '' ) ) {
			return;
		}
		echo '<style>#titlediv{display:none!important}</style>';
	}

	public static function meta_boxes(): void {
		add_meta_box(
			'kpf-grant-details',
			__( 'Grant details', 'kpf-core' ),
			array( self::class, 'render_details_meta_box' ),
			ContentType::POST_TYPE,
			'normal',
			'high'
		);
	}

	public static function render_details_meta_box( WP_Post $post ): void {
		$meta     = Meta::get( (int) $post->ID );
		$month    = (int) ( $meta['awarded_month'] ?? 0 );
		$year     = (int) ( $meta['awarded_year'] ?? 0 );
		$check_id = (int) ( $meta['check_photo_id'] ?? 0 );
		$check_url = $check_id > 0 ? (string) wp_get_attachment_image_url( $check_id, 'medium' ) : '';
		$grantee_id = (int) ( $meta['grantee_id'] ?? 0 );
		$grantees = self::grantee_choices();

		wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );
		?>
		<style>
			.kpf-grant-fields { display: grid; gap: 14px; max-width: 40rem; }
			.kpf-grant-fields label { display: block; font-weight: 600; margin-bottom: 4px; }
			.kpf-grant-fields .description { margin: 4px 0 0; color: #646970; }
			.kpf-grant-fields input[type="text"],
			.kpf-grant-fields input[type="number"],
			.kpf-grant-fields select { width: 100%; max-width: 28rem; }
			.kpf-grant-fields__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 28rem; }
			.kpf-grant-check-preview img {
				display: block;
				max-width: 240px;
				height: auto;
				margin-top: 8px;
				border-radius: 4px;
				background: #f6f7f7;
				border: 1px solid #dcdcde;
			}
			@media (max-width: 782px) {
				.kpf-grant-fields__row { grid-template-columns: 1fr; }
			}
		</style>
		<div class="kpf-grant-fields">
			<p class="description" style="margin-top:0">
				<?php
				esc_html_e(
					'The grant title is generated automatically from recipient, date, and amount.',
					'kpf-core'
				);
				?>
			</p>
			<div>
				<label for="kpf_grant_grantee_id"><?php esc_html_e( 'Recipient', 'kpf-core' ); ?></label>
				<select id="kpf_grant_grantee_id" name="kpf_grant[grantee_id]" required>
					<option value="0"><?php esc_html_e( 'Select grantee…', 'kpf-core' ); ?></option>
					<?php foreach ( $grantees as $id => $label ) : ?>
						<option value="<?php echo esc_attr( (string) $id ); ?>" <?php selected( $grantee_id, $id ); ?>>
							<?php echo esc_html( $label ); ?>
						</option>
					<?php endforeach; ?>
				</select>
				<p class="description">
					<?php
					printf(
						/* translators: %s: URL to add a grantee */
						wp_kses(
							__( 'Required. Manage organizations under <a href="%s">Grantees</a>.', 'kpf-core' ),
							array( 'a' => array( 'href' => array() ) )
						),
						esc_url( admin_url( 'edit.php?post_type=' . GranteeContentType::POST_TYPE ) )
					);
					?>
				</p>
			</div>
			<div>
				<label for="kpf_grant_grant_amount"><?php esc_html_e( 'Grant amount', 'kpf-core' ); ?></label>
				<input
					type="number"
					id="kpf_grant_grant_amount"
					name="kpf_grant[grant_amount]"
					value="<?php
					$amount = (float) ( $meta['grant_amount'] ?? 0 );
					echo $amount > 0 ? esc_attr( (string) $amount ) : '';
					?>"
					min="0"
					step="0.01"
					placeholder="5000"
					class="regular-text"
					style="max-width:12rem"
					inputmode="decimal"
				/>
				<p class="description"><?php esc_html_e( 'Optional. USD amount awarded.', 'kpf-core' ); ?></p>
			</div>
			<div class="kpf-grant-fields__row">
				<div>
					<label for="kpf_grant_awarded_month"><?php esc_html_e( 'Month awarded', 'kpf-core' ); ?></label>
					<select id="kpf_grant_awarded_month" name="kpf_grant[awarded_month]">
						<option value="0"><?php esc_html_e( 'Select month…', 'kpf-core' ); ?></option>
						<?php
						for ( $m = 1; $m <= 12; $m++ ) {
							$label = gmdate( 'F', mktime( 0, 0, 0, $m, 1, 2000 ) );
							printf(
								'<option value="%1$d"%2$s>%3$s</option>',
								$m,
								selected( $month, $m, false ),
								esc_html( $label )
							);
						}
						?>
					</select>
				</div>
				<div>
					<label for="kpf_grant_awarded_year"><?php esc_html_e( 'Year awarded', 'kpf-core' ); ?></label>
					<input
						type="number"
						id="kpf_grant_awarded_year"
						name="kpf_grant[awarded_year]"
						value="<?php echo $year > 0 ? esc_attr( (string) $year ) : ''; ?>"
						min="1900"
						max="2100"
						placeholder="2024"
						class="small-text"
						style="max-width:8rem"
					/>
				</div>
			</div>
			<p class="description"><?php esc_html_e( 'Preferred. Used for default list sorting (newest first).', 'kpf-core' ); ?></p>
			<div>
				<label for="kpf_grant_check_photo_id"><?php esc_html_e( 'Check presentation photo', 'kpf-core' ); ?></label>
				<input
					type="hidden"
					id="kpf_grant_check_photo_id"
					name="kpf_grant[check_photo_id]"
					value="<?php echo $check_id > 0 ? esc_attr( (string) $check_id ) : ''; ?>"
				/>
				<button type="button" class="button kpf-grant-check-upload">
					<?php
					echo $check_id > 0
						? esc_html__( 'Replace photo', 'kpf-core' )
						: esc_html__( 'Choose photo', 'kpf-core' );
					?>
				</button>
				<button
					type="button"
					class="button kpf-grant-check-clear"
					<?php echo $check_id > 0 ? '' : 'style="display:none;"'; ?>
				>
					<?php esc_html_e( 'Remove', 'kpf-core' ); ?>
				</button>
				<p class="kpf-grant-check-preview">
					<?php if ( $check_url !== '' ) : ?>
						<img src="<?php echo esc_url( $check_url ); ?>" alt="" />
					<?php endif; ?>
				</p>
				<p class="description">
					<?php
					esc_html_e(
						'Optional. Photo of someone from KPF presenting the oversized grant check to the recipient.',
						'kpf-core'
					);
					?>
				</p>
			</div>
		</div>
		<?php
	}

	public static function enqueue_assets( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::POST_TYPE !== ( $screen->post_type ?? '' ) ) {
			return;
		}

		wp_enqueue_media();
		wp_add_inline_script(
			'jquery',
			<<<'JS'
jQuery(function ($) {
	var frame;
	var $input = $('#kpf_grant_check_photo_id');
	var $preview = $('.kpf-grant-check-preview');
	var $clear = $('.kpf-grant-check-clear');
	var $upload = $('.kpf-grant-check-upload');
	if (!$input.length) { return; }

	$upload.on('click', function (e) {
		e.preventDefault();
		if (frame) { frame.open(); return; }
		frame = wp.media({
			title: 'Choose check presentation photo',
			button: { text: 'Use photo' },
			library: { type: 'image' },
			multiple: false
		});
		frame.on('select', function () {
			var attachment = frame.state().get('selection').first().toJSON();
			var url = (attachment.sizes && attachment.sizes.medium)
				? attachment.sizes.medium.url
				: attachment.url;
			$input.val(attachment.id);
			$preview.html('<img src="' + url + '" alt="" />');
			$clear.show();
			$upload.text('Replace photo');
		});
		frame.open();
	});

	$clear.on('click', function (e) {
		e.preventDefault();
		$input.val('');
		$preview.empty();
		$clear.hide();
		$upload.text('Choose photo');
	});
});
JS
		);
	}

	public static function save( int $post_id, WP_Post $post ): void {
		unset( $post );

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( ! isset( $_POST[ self::NONCE_NAME ] ) ) {
			return;
		}
		$nonce = sanitize_text_field( wp_unslash( (string) $_POST[ self::NONCE_NAME ] ) );
		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( ! isset( $_POST['kpf_grant'] ) || ! is_array( $_POST['kpf_grant'] ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized via Meta::sanitize().
		$raw   = wp_unslash( $_POST['kpf_grant'] );
		$clean = Meta::sanitize( is_array( $raw ) ? $raw : array() );
		Meta::save( $post_id, $clean );

		$title = Meta::compose_title( $clean );
		remove_action( 'save_post_' . ContentType::POST_TYPE, array( self::class, 'save' ), 10 );
		wp_update_post(
			array(
				'ID'         => $post_id,
				'post_title' => $title,
			)
		);
		add_action( 'save_post_' . ContentType::POST_TYPE, array( self::class, 'save' ), 10, 2 );
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns( array $columns ): array {
		return array(
			'cb'             => $columns['cb'] ?? '<input type="checkbox" />',
			'title'          => __( 'Grant', 'kpf-core' ),
			'kpf_recipient'  => __( 'Recipient', 'kpf-core' ),
			'kpf_amount'     => __( 'Amount', 'kpf-core' ),
			'kpf_awarded'    => __( 'Awarded', 'kpf-core' ),
			'kpf_check'      => __( 'Check photo', 'kpf-core' ),
			'date'           => __( 'Date', 'kpf-core' ),
		);
	}

	/**
	 * @param array<string, string|array<int, mixed>> $columns
	 * @return array<string, string|array<int, mixed>>
	 */
	public static function sortable_columns( array $columns ): array {
		$columns['kpf_recipient'] = array(
			Meta::SORT_RECIPIENT_KEY,
			false,
			__( 'Recipient', 'kpf-core' ),
			__( 'Table ordered by recipient.', 'kpf-core' ),
			'asc',
		);
		$columns['kpf_amount']    = array(
			Meta::SORT_AMOUNT_KEY,
			true,
			__( 'Amount', 'kpf-core' ),
			__( 'Table ordered by grant amount.', 'kpf-core' ),
		);
		$columns['kpf_awarded']   = array(
			Meta::SORT_DATE_KEY,
			true,
			__( 'Awarded', 'kpf-core' ),
			__( 'Table ordered by award date.', 'kpf-core' ),
			'desc',
		);
		return $columns;
	}

	public static function apply_sorting( WP_Query $query ): void {
		if ( ! is_admin() || ! $query->is_main_query() ) {
			return;
		}
		if ( ContentType::POST_TYPE !== $query->get( 'post_type' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only list-table sort params.
		$orderby = isset( $_GET['orderby'] ) ? sanitize_key( (string) wp_unslash( $_GET['orderby'] ) ) : '';

		if ( '' === $orderby || Meta::SORT_DATE_KEY === $orderby || 'kpf_awarded' === $orderby ) {
			$query->set( 'meta_key', Meta::SORT_DATE_KEY );
			$query->set( 'orderby', 'meta_value_num' );
			if ( '' === $orderby ) {
				$query->set( 'order', 'DESC' );
			}
			return;
		}

		if ( Meta::SORT_AMOUNT_KEY === $orderby || 'kpf_amount' === $orderby ) {
			$query->set( 'meta_key', Meta::SORT_AMOUNT_KEY );
			$query->set( 'orderby', 'meta_value_num' );
			return;
		}

		if ( Meta::SORT_RECIPIENT_KEY === $orderby || 'kpf_recipient' === $orderby ) {
			$query->set( 'meta_key', Meta::SORT_RECIPIENT_KEY );
			$query->set( 'orderby', 'meta_value' );
		}
	}

	public static function render_column( string $column, int $post_id ): void {
		$meta = Meta::get( $post_id );

		switch ( $column ) {
			case 'kpf_recipient':
				$grantee_id = (int) ( $meta['grantee_id'] ?? 0 );
				$name       = (string) ( $meta['recipient_name'] ?? '' );
				if ( $grantee_id > 0 && $name !== '' ) {
					printf(
						'<a href="%s">%s</a>',
						esc_url( get_edit_post_link( $grantee_id, 'raw' ) ?: '#' ),
						esc_html( $name )
					);
				} elseif ( $name !== '' ) {
					echo esc_html( $name );
				} else {
					echo '<span aria-hidden="true">—</span>';
				}
				break;
			case 'kpf_amount':
				$label = Meta::format_grant_amount( $meta );
				echo $label !== '' ? esc_html( $label ) : '<span aria-hidden="true">—</span>';
				break;
			case 'kpf_awarded':
				$label = Meta::format_awarded( $meta );
				echo $label !== '' ? esc_html( $label ) : '<span aria-hidden="true">—</span>';
				break;
			case 'kpf_check':
				$check_id = (int) ( $meta['check_photo_id'] ?? 0 );
				if ( $check_id > 0 ) {
					echo wp_get_attachment_image(
						$check_id,
						array( 48, 48 ),
						false,
						array(
							'style' => 'width:48px;height:48px;object-fit:cover;border-radius:4px;background:#f6f7f7;',
						)
					);
				} else {
					echo '<span aria-hidden="true">—</span>';
				}
				break;
		}
	}

	public static function editor_intro( WP_Post $post ): void {
		if ( ContentType::POST_TYPE !== $post->post_type ) {
			return;
		}

		echo '<div class="notice notice-info inline" style="margin:12px 0;"><p>';
		echo esc_html__(
			'Record one Foundation award. Choose the recipient organization, then add date, amount, and optional check photo.',
			'kpf-core'
		);
		echo '</p></div>';
	}

	/**
	 * @return array<int, string>
	 */
	private static function grantee_choices(): array {
		$query = new WP_Query(
			array(
				'post_type'              => GranteeContentType::POST_TYPE,
				'post_status'            => array( 'publish', 'draft', 'private', 'pending' ),
				'posts_per_page'         => 200,
				'orderby'                => 'title',
				'order'                  => 'ASC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		$out = array();
		foreach ( $query->posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$out[ (int) $post->ID ] = $post->post_title !== '' ? $post->post_title : __( '(untitled)', 'kpf-core' );
			}
		}
		return $out;
	}
}
