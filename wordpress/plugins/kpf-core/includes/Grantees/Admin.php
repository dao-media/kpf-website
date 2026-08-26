<?php

declare(strict_types=1);

namespace KPF\Core\Grantees;

use KPF\Core\Grants\Totals as GrantTotals;
use WP_Post;
use WP_Query;

final class Admin {
	private const NONCE_ACTION = 'kpf_grantee_details_save';
	private const NONCE_NAME   = 'kpf_grantee_details_nonce';

	/** Guard so summary sorting does not recurse into pre_get_posts. */
	private static $sorting_summaries = false;

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
		add_action( 'pre_get_posts', array( self::class, 'apply_default_sorting' ) );
		add_action( 'admin_head', array( self::class, 'list_table_styles' ) );
		add_filter(
			'enter_title_here',
			static function ( string $title, WP_Post $post ): string {
				return ContentType::POST_TYPE === $post->post_type
					? __( 'Business / organization name', 'kpf-core' )
					: $title;
			},
			10,
			2
		);
		add_action( 'edit_form_after_title', array( self::class, 'editor_intro' ) );
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

	public static function meta_boxes(): void {
		add_meta_box(
			'kpf-grantee-details',
			__( 'Grantee details', 'kpf-core' ),
			array( self::class, 'render_details_meta_box' ),
			ContentType::POST_TYPE,
			'normal',
			'high'
		);
	}

	public static function render_details_meta_box( WP_Post $post ): void {
		$meta = Meta::get( (int) $post->ID );

		wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );
		?>
		<style>
			.kpf-grantee-fields { display: grid; gap: 14px; max-width: 40rem; }
			.kpf-grantee-fields label { display: block; font-weight: 600; margin-bottom: 4px; }
			.kpf-grantee-fields .description { margin: 4px 0 0; color: #646970; }
			.kpf-grantee-fields input[type="text"],
			.kpf-grantee-fields input[type="url"],
			.kpf-grantee-fields textarea { width: 100%; max-width: 28rem; }
			.kpf-grantee-fields textarea { min-height: 5.5rem; }
		</style>
		<div class="kpf-grantee-fields">
			<p class="description" style="margin-top:0">
				<?php
				echo esc_html__(
					'Logo: use “Logo / profile image” in the sidebar (JPEG, PNG, or SVG). Organization name is the title above. Awards live under Grants.',
					'kpf-core'
				);
				?>
			</p>
			<div>
				<label for="kpf_grantee_contact_name"><?php esc_html_e( 'Point of contact', 'kpf-core' ); ?></label>
				<input
					type="text"
					id="kpf_grantee_contact_name"
					name="kpf_grantee[contact_name]"
					value="<?php echo esc_attr( (string) ( $meta['contact_name'] ?? '' ) ); ?>"
					class="regular-text"
					autocomplete="name"
				/>
				<p class="description"><?php esc_html_e( 'Optional. Admin-only; not shown in the slider.', 'kpf-core' ); ?></p>
			</div>
			<div>
				<label for="kpf_grantee_website"><?php esc_html_e( 'Website', 'kpf-core' ); ?></label>
				<input
					type="url"
					id="kpf_grantee_website"
					name="kpf_grantee[website]"
					value="<?php echo esc_attr( (string) ( $meta['website'] ?? '' ) ); ?>"
					class="regular-text"
					placeholder="https://"
					inputmode="url"
				/>
				<p class="description"><?php esc_html_e( 'Preferred. Include https:// when possible.', 'kpf-core' ); ?></p>
			</div>
			<div>
				<label for="kpf_grantee_blurb"><?php esc_html_e( 'Mission / blurb', 'kpf-core' ); ?></label>
				<textarea
					id="kpf_grantee_blurb"
					name="kpf_grantee[blurb]"
					rows="4"
					class="large-text"
				><?php echo esc_textarea( (string) ( $meta['blurb'] ?? '' ) ); ?></textarea>
				<p class="description"><?php esc_html_e( 'Optional. Short description, mission statement, or blurb for the partners slider.', 'kpf-core' ); ?></p>
			</div>
		</div>
		<?php
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
		if ( ! isset( $_POST['kpf_grantee'] ) || ! is_array( $_POST['kpf_grantee'] ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized via Meta::sanitize().
		$raw   = wp_unslash( $_POST['kpf_grantee'] );
		$clean = Meta::sanitize( is_array( $raw ) ? $raw : array() );
		update_post_meta( $post_id, Meta::META_KEY, $clean );
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns( array $columns ): array {
		return array(
			'cb'            => $columns['cb'] ?? '<input type="checkbox" />',
			'kpf_logo'      => __( 'Logo', 'kpf-core' ),
			'title'         => __( 'Organization', 'kpf-core' ),
			'kpf_grants'    => __( 'Grants', 'kpf-core' ),
			'kpf_granted'   => __( 'Total granted', 'kpf-core' ),
			'kpf_contact'   => __( 'Point of contact', 'kpf-core' ),
			'kpf_website'   => __( 'Website', 'kpf-core' ),
			'date'          => __( 'Date', 'kpf-core' ),
		);
	}

	/**
	 * @param array<string, string|array<int, mixed>> $columns
	 * @return array<string, string|array<int, mixed>>
	 */
	public static function sortable_columns( array $columns ): array {
		$columns['title'] = array(
			'title',
			false,
			__( 'Organization', 'kpf-core' ),
			__( 'Table ordered by organization name.', 'kpf-core' ),
			'asc',
		);
		$columns['kpf_grants']  = array(
			'kpf_grants',
			true,
			__( 'Grants', 'kpf-core' ),
			__( 'Table ordered by number of published grants.', 'kpf-core' ),
			'desc',
		);
		$columns['kpf_granted'] = array(
			'kpf_granted',
			true,
			__( 'Total granted', 'kpf-core' ),
			__( 'Table ordered by total amount granted.', 'kpf-core' ),
			'desc',
		);
		$columns['date']        = array(
			'date',
			true,
			__( 'Date', 'kpf-core' ),
			__( 'Table ordered by date.', 'kpf-core' ),
		);
		return $columns;
	}

	public static function apply_default_sorting( WP_Query $query ): void {
		if ( ! is_admin() || ! $query->is_main_query() || self::$sorting_summaries ) {
			return;
		}
		if ( ContentType::POST_TYPE !== $query->get( 'post_type' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only list-table sort params.
		$orderby = isset( $_GET['orderby'] ) ? sanitize_key( (string) wp_unslash( $_GET['orderby'] ) ) : '';

		if ( 'kpf_grants' === $orderby || 'kpf_granted' === $orderby ) {
			self::order_by_grant_summary( $query, $orderby );
			return;
		}

		if ( $orderby !== '' ) {
			return;
		}

		$query->set( 'orderby', 'title' );
		$query->set( 'order', 'ASC' );
	}

	public static function list_table_styles(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'edit-' . ContentType::POST_TYPE !== $screen->id ) {
			return;
		}
		echo '<style id="kpf-grantee-list-cols">'
			. '.column-kpf_grants,.column-kpf_granted{width:9rem;text-align:right}'
			. '.column-kpf_grants .kpf-num,.column-kpf_granted .kpf-num{font-variant-numeric:tabular-nums}'
			. '</style>';
	}

	private static function order_by_grant_summary( WP_Query $query, string $column ): void {
		self::$sorting_summaries = true;

		$status = $query->get( 'post_status' );
		if ( $status === '' || $status === 'all' ) {
			$status = array( 'publish', 'pending', 'draft', 'future', 'private' );
		}

		$ids = get_posts(
			array(
				'post_type'              => ContentType::POST_TYPE,
				'post_status'            => $status,
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'suppress_filters'       => true,
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				's'                      => (string) $query->get( 's' ),
			)
		);

		self::$sorting_summaries = false;

		$summaries = GrantTotals::by_grantee();
		$key       = 'kpf_grants' === $column ? 'count' : 'amount';
		$order     = strtoupper( (string) $query->get( 'order' ) ) === 'ASC' ? 'ASC' : 'DESC';

		usort(
			$ids,
			static function ( $a, $b ) use ( $summaries, $key, $order ): int {
				$va = $summaries[ (int) $a ][ $key ] ?? 0;
				$vb = $summaries[ (int) $b ][ $key ] ?? 0;
				if ( $va === $vb ) {
					return (int) $a <=> (int) $b;
				}
				$cmp = $va <=> $vb;
				return 'ASC' === $order ? $cmp : -$cmp;
			}
		);

		$query->set( 'post__in', $ids !== array() ? $ids : array( 0 ) );
		$query->set( 'orderby', 'post__in' );
	}

	public static function render_column( string $column, int $post_id ): void {
		if ( 'kpf_grants' === $column || 'kpf_granted' === $column ) {
			$summary = GrantTotals::for_grantee( $post_id );
			if ( 'kpf_grants' === $column ) {
				echo '<span class="kpf-num">' . esc_html( number_format_i18n( $summary['count'] ) ) . '</span>';
				return;
			}
			$label = GrantTotals::format_amount( $summary['amount'] );
			echo $label !== ''
				? '<span class="kpf-num">' . esc_html( $label ) . '</span>'
				: '<span aria-hidden="true">—</span>';
			return;
		}

		$meta = Meta::get( $post_id );

		switch ( $column ) {
			case 'kpf_logo':
				$image_id = (int) get_post_thumbnail_id( $post_id );
				if ( $image_id > 0 ) {
					echo wp_get_attachment_image(
						$image_id,
						array( 48, 48 ),
						false,
						array(
							'style' => 'width:48px;height:48px;object-fit:contain;border-radius:4px;background:#f6f7f7;',
						)
					);
				} else {
					echo '<span aria-hidden="true">—</span>';
				}
				break;
			case 'kpf_contact':
				$contact = (string) ( $meta['contact_name'] ?? '' );
				echo $contact !== '' ? esc_html( $contact ) : '<span aria-hidden="true">—</span>';
				break;
			case 'kpf_website':
				$website = (string) ( $meta['website'] ?? '' );
				if ( $website !== '' ) {
					$host = wp_parse_url( $website, PHP_URL_HOST );
					echo '<a href="' . esc_url( $website ) . '" target="_blank" rel="noopener noreferrer">' .
						esc_html( is_string( $host ) && $host !== '' ? $host : $website ) .
						'</a>';
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
			'Grantees are recipient organizations. Add awards under Grants and pick this organization as the recipient.',
			'kpf-core'
		);
		echo '</p></div>';
	}
}
