<?php

declare(strict_types=1);

namespace KPF\Core\Code;

use WP_Post;

final class Admin {
	public static function register(): void {
		add_action( 'add_meta_boxes', array( self::class, 'meta_boxes' ) );
		add_action( 'save_post_' . ContentType::POST_TYPE, array( self::class, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
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
			'enter_title_here',
			static function ( string $title, WP_Post $post ): string {
				return ContentType::POST_TYPE === $post->post_type
					? __( 'Snippet name (e.g. Google Tag Manager)', 'kpf-core' )
					: $title;
			},
			10,
			2
		);
		add_action( 'admin_head', array( self::class, 'hide_slug_ui' ) );
	}

	public static function meta_boxes(): void {
		add_meta_box(
			'kpf-code-settings',
			__( 'Snippet settings', 'kpf-core' ),
			array( self::class, 'render_settings' ),
			ContentType::POST_TYPE,
			'side',
			'high'
		);
		add_meta_box(
			'kpf-code-source',
			__( 'Code', 'kpf-core' ),
			array( self::class, 'render_source' ),
			ContentType::POST_TYPE,
			'normal',
			'high'
		);
	}

	public static function enqueue( string $hook ): void {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::POST_TYPE !== $screen->post_type ) {
			return;
		}

		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return;
		}

		$settings = wp_enqueue_code_editor( array( 'type' => 'text/html' ) );
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		wp_enqueue_script( 'jquery' );
		wp_add_inline_script(
			'code-editor',
			'window.kpfCodeEditorSettings = ' . wp_json_encode( $settings ) . ';',
			'before'
		);
		wp_add_inline_script(
			'code-editor',
			<<<'JS'
jQuery(function ($) {
	var $textarea = $('#kpf-code-source-field');
	if (!$textarea.length || !window.wp || !wp.codeEditor) return;
	var type = $('#kpf_code_type').val() || 'html';
	var mode = type === 'css' ? 'text/css' : (type === 'js' ? 'text/javascript' : 'text/html');
	var settings = $.extend(true, {}, window.kpfCodeEditorSettings || {}, {
		codemirror: {
			mode: mode,
			lineNumbers: true,
			lineWrapping: false,
			indentUnit: 2,
			tabSize: 2,
			styleActiveLine: true,
			matchBrackets: true
		}
	});
	var instance = wp.codeEditor.initialize($textarea[0], settings);
	var cm = instance && instance.codemirror;
	$('#kpf_code_type').on('change', function () {
		if (!cm) return;
		var next = $(this).val();
		var nextMode = next === 'css' ? 'text/css' : (next === 'js' ? 'text/javascript' : 'text/html');
		cm.setOption('mode', nextMode);
	});
	$('#kpf_code_scope').on('change', function () {
		$('.kpf-code-urls-row').toggle($(this).val() === 'urls');
	}).trigger('change');
});
JS
		);

		wp_add_inline_style(
			'code-editor',
			'
			.kpf-code-editor-wrap .CodeMirror {
				border: 1px solid #c3c4c7;
				height: 420px;
				font-size: 13px;
			}
			body.kpf-admin-theme .kpf-code-editor-wrap .CodeMirror {
				background: #1e1e1e;
				border-color: #2b2b2b;
				color: #d4d4d4;
			}
			body.kpf-admin-theme .kpf-code-editor-wrap .CodeMirror-gutters {
				background: #1e1e1e;
				border-right-color: #2b2b2b;
			}
			body.kpf-admin-theme .kpf-code-editor-wrap .CodeMirror-linenumber { color: #858585; }
			body.kpf-admin-theme .kpf-code-editor-wrap .CodeMirror-cursor { border-left-color: #aeafad; }
			body.kpf-admin-theme .kpf-code-editor-wrap .CodeMirror-selected { background: #264f78 !important; }
			.kpf-code-urls-row textarea { width: 100%; min-height: 110px; font-family: Menlo, Monaco, Consolas, monospace; font-size: 12px; }
			.kpf-code-help { color: #646970; font-size: 12px; margin: 6px 0 0; }
			'
		);
	}

	public static function render_settings( WP_Post $post ): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			echo '<p>' . esc_html__( 'You need permission to manage theme options to edit code snippets.', 'kpf-core' ) . '</p>';
			return;
		}

		$meta = Meta::get( (int) $post->ID );
		wp_nonce_field( 'kpf_code_save', 'kpf_code_nonce' );
		?>
		<p>
			<label for="kpf_code_location"><strong><?php esc_html_e( 'Placement', 'kpf-core' ); ?></strong></label><br />
			<select name="kpf_code_location" id="kpf_code_location" style="width:100%;">
				<option value="header" <?php selected( $meta['location'], 'header' ); ?>><?php esc_html_e( 'Header', 'kpf-core' ); ?></option>
				<option value="footer" <?php selected( $meta['location'], 'footer' ); ?>><?php esc_html_e( 'Footer', 'kpf-core' ); ?></option>
			</select>
		</p>
		<p>
			<label for="kpf_code_type"><strong><?php esc_html_e( 'Type', 'kpf-core' ); ?></strong></label><br />
			<select name="kpf_code_type" id="kpf_code_type" style="width:100%;">
				<option value="html" <?php selected( $meta['type'], 'html' ); ?>><?php esc_html_e( 'HTML', 'kpf-core' ); ?></option>
				<option value="css" <?php selected( $meta['type'], 'css' ); ?>><?php esc_html_e( 'CSS', 'kpf-core' ); ?></option>
				<option value="js" <?php selected( $meta['type'], 'js' ); ?>><?php esc_html_e( 'JavaScript', 'kpf-core' ); ?></option>
			</select>
		</p>
		<p>
			<label for="kpf_code_scope"><strong><?php esc_html_e( 'Scope', 'kpf-core' ); ?></strong></label><br />
			<select name="kpf_code_scope" id="kpf_code_scope" style="width:100%;">
				<option value="global" <?php selected( $meta['scope'], 'global' ); ?>><?php esc_html_e( 'Entire site', 'kpf-core' ); ?></option>
				<option value="urls" <?php selected( $meta['scope'], 'urls' ); ?>><?php esc_html_e( 'Specific URL(s)', 'kpf-core' ); ?></option>
			</select>
		</p>
		<div class="kpf-code-urls-row">
			<label for="kpf_code_urls"><strong><?php esc_html_e( 'URLs', 'kpf-core' ); ?></strong></label>
			<textarea name="kpf_code_urls" id="kpf_code_urls" rows="5"><?php echo esc_textarea( implode( "\n", $meta['urls'] ) ); ?></textarea>
			<p class="kpf-code-help">
				<?php esc_html_e( 'One path per line. Examples: /about, /blog/*, /events/summer-gathering', 'kpf-core' ); ?>
			</p>
		</div>
		<p class="kpf-code-help">
			<?php esc_html_e( 'Publish to activate. Save as Draft to keep inactive.', 'kpf-core' ); ?>
		</p>
		<?php
	}

	public static function render_source( WP_Post $post ): void {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return;
		}

		$meta = Meta::get( (int) $post->ID );
		?>
		<div class="kpf-code-editor-wrap">
			<label class="screen-reader-text" for="kpf-code-source-field"><?php esc_html_e( 'Snippet source', 'kpf-core' ); ?></label>
			<textarea id="kpf-code-source-field" name="kpf_code_source" rows="18" style="width:100%;"><?php echo esc_textarea( (string) $meta['code'] ); ?></textarea>
			<p class="kpf-code-help">
				<?php
				echo esc_html(
					sprintf(
						/* translators: %s: max size */
						__( 'Trusted site code only. Maximum size %s.', 'kpf-core' ),
						size_format( Meta::MAX_BYTES )
					)
				);
				?>
			</p>
		</div>
		<?php
	}

	public static function save( int $post_id, WP_Post $post ): void {
		unset( $post );
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return;
		}
		if ( ! isset( $_POST['kpf_code_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( (string) $_POST['kpf_code_nonce'] ) ), 'kpf_code_save' ) ) {
			return;
		}

		$urls_raw = isset( $_POST['kpf_code_urls'] ) ? (string) wp_unslash( $_POST['kpf_code_urls'] ) : '';
		$urls     = preg_split( '/\r\n|\r|\n/', $urls_raw ) ?: array();

		Meta::update(
			$post_id,
			array(
				'location' => isset( $_POST['kpf_code_location'] ) ? (string) wp_unslash( $_POST['kpf_code_location'] ) : 'header',
				'type'     => isset( $_POST['kpf_code_type'] ) ? (string) wp_unslash( $_POST['kpf_code_type'] ) : 'html',
				'code'     => isset( $_POST['kpf_code_source'] ) ? (string) wp_unslash( $_POST['kpf_code_source'] ) : '',
				'scope'    => isset( $_POST['kpf_code_scope'] ) ? (string) wp_unslash( $_POST['kpf_code_scope'] ) : 'global',
				'urls'     => $urls,
			)
		);
	}

	/**
	 * @param array<string, string> $columns
	 * @return array<string, string>
	 */
	public static function columns( array $columns ): array {
		return array(
			'cb'               => $columns['cb'] ?? '<input type="checkbox" />',
			'title'            => __( 'Snippet', 'kpf-core' ),
			'kpf_code_location'=> __( 'Placement', 'kpf-core' ),
			'kpf_code_type'    => __( 'Type', 'kpf-core' ),
			'kpf_code_scope'   => __( 'Scope', 'kpf-core' ),
			'kpf_code_status'  => __( 'Status', 'kpf-core' ),
			'date'             => $columns['date'] ?? __( 'Date', 'kpf-core' ),
		);
	}

	public static function render_column( string $column, int $post_id ): void {
		$meta   = Meta::get( $post_id );
		$status = get_post_status( $post_id );

		switch ( $column ) {
			case 'kpf_code_location':
				echo esc_html( 'footer' === $meta['location'] ? __( 'Footer', 'kpf-core' ) : __( 'Header', 'kpf-core' ) );
				break;
			case 'kpf_code_type':
				$map = array(
					'html' => 'HTML',
					'css'  => 'CSS',
					'js'   => 'JavaScript',
				);
				echo esc_html( $map[ $meta['type'] ] ?? strtoupper( (string) $meta['type'] ) );
				break;
			case 'kpf_code_scope':
				if ( 'urls' === $meta['scope'] ) {
					$count = count( $meta['urls'] );
					echo esc_html(
						sprintf(
							/* translators: %d: number of URL patterns */
							_n( '%d URL', '%d URLs', $count, 'kpf-core' ),
							$count
						)
					);
				} else {
					esc_html_e( 'Entire site', 'kpf-core' );
				}
				break;
			case 'kpf_code_status':
				echo 'publish' === $status
					? '<span style="color:#0a7a34;font-weight:600;">' . esc_html__( 'Active', 'kpf-core' ) . '</span>'
					: '<span style="color:#646970;">' . esc_html__( 'Inactive', 'kpf-core' ) . '</span>';
				break;
		}
	}

	public static function hide_slug_ui(): void {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ContentType::POST_TYPE !== $screen->post_type ) {
			return;
		}
		echo '<style>#edit-slug-box,.misc-pub-visibility{display:none!important;}</style>';
	}
}
