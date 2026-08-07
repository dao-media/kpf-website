<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

/**
 * Admin bar node for cross-page backup progress.
 */
final class AdminBar {
	public const NODE_ID = 'kpf-backups-job';

	public static function register(): void {
		add_action( 'admin_bar_menu', array( self::class, 'menu' ), 75 );
		add_action( 'admin_head', array( self::class, 'styles' ), 1 );
		add_action( 'wp_head', array( self::class, 'styles' ), 1 );
	}

	public static function menu( \WP_Admin_Bar $bar ): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$bar->add_node(
			array(
				'id'     => self::NODE_ID,
				// Keep this on the right so showing/hiding never reflows Performance / GraphQL.
				'parent' => 'top-secondary',
				'title'  => self::title_markup(),
				'href'   => admin_url( 'admin.php?page=' . Admin::MENU_SLUG ),
				'meta'   => array(
					'class' => 'kpf-backups-ab kpf-backups-ab--idle',
					'title' => __( 'Site backup', 'kpf-core' ),
				),
			)
		);
	}

	public static function styles(): void {
		if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// Reveal before first paint when a job is already in progress (avoids admin-bar reflow).
		echo '<script id="kpf-backups-admin-bar-boot">(function(){try{var pending=!!localStorage.getItem("kpf_backup_job_id");if(!pending){var raw=sessionStorage.getItem("kpf_backup_job_done");if(raw){var done=JSON.parse(raw);pending=!!(done&&done.at&&Date.now()-done.at<8000);}}if(pending){document.documentElement.classList.add("kpf-backup-job-pending");}}catch(e){}})();</script>';

		echo '<style id="kpf-backups-admin-bar">
			#wpadminbar #wp-admin-bar-kpf-backups-job.kpf-backups-ab--idle {
				display: none !important;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job.kpf-backups-ab--active,
			#wpadminbar #wp-admin-bar-kpf-backups-job.kpf-backups-ab--complete,
			html.kpf-backup-job-pending #wpadminbar #wp-admin-bar-kpf-backups-job.kpf-backups-ab--idle,
			html.kpf-backup-job-pending #wpadminbar #wp-admin-bar-kpf-backups-job {
				display: list-item !important;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job > .ab-item {
				align-items: center;
				box-sizing: border-box;
				display: flex !important;
				gap: 8px;
				height: 32px;
				line-height: 32px;
				max-height: 32px;
				overflow: hidden;
				padding: 0 10px 0 8px !important;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job .ab-icon {
				float: none;
				font-size: 0;
				height: 18px;
				line-height: 1;
				margin: 0;
				padding: 0;
				position: relative;
				text-indent: 0;
				top: 0;
				width: 18px;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job .kpf-backups-ab__track {
				background: rgba(255,255,255,0.22);
				border-radius: 999px;
				display: block;
				flex: 0 0 auto;
				height: 3px;
				overflow: hidden;
				width: 72px;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job .kpf-backups-ab__fill {
				background: #72aee6;
				border-radius: inherit;
				display: block;
				height: 100%;
				transition: width 280ms ease;
				width: 0%;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job.kpf-backups-ab--complete .kpf-backups-ab__fill {
				background: #68de7c;
			}
			#wpadminbar #wp-admin-bar-kpf-backups-job.kpf-backups-ab--fading {
				opacity: 0;
				pointer-events: none;
				transition: opacity 700ms ease;
			}
		</style>';
	}

	private static function title_markup(): string {
		return '<span class="ab-icon" aria-hidden="true"></span><span class="kpf-backups-ab__track" aria-hidden="true"><span class="kpf-backups-ab__fill"></span></span><span class="screen-reader-text">' . esc_html__( 'Backup in progress', 'kpf-core' ) . '</span>';
	}
}
