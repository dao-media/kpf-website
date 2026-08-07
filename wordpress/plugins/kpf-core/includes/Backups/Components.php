<?php

declare(strict_types=1);

namespace KPF\Core\Backups;

final class Components {
	/**
	 * @return array<string, array{label:string,description:string,group:string}>
	 */
	public static function definitions(): array {
		return array(
			'database' => array(
				'label'       => __( 'Content (database)', 'kpf-core' ),
				'description' => __( 'Posts, pages, options, users, and all other database tables.', 'kpf-core' ),
				'group'       => 'data',
			),
			'media'    => array(
				'label'       => __( 'Media library', 'kpf-core' ),
				'description' => __( 'Files in the uploads directory (images, documents, etc.).', 'kpf-core' ),
				'group'       => 'files',
			),
			'plugins'  => array(
				'label'       => __( 'Plugins', 'kpf-core' ),
				'description' => __( 'Installed plugin files under wp-content/plugins.', 'kpf-core' ),
				'group'       => 'files',
			),
			'themes'   => array(
				'label'       => __( 'Themes', 'kpf-core' ),
				'description' => __( 'Installed theme files under wp-content/themes.', 'kpf-core' ),
				'group'       => 'files',
			),
			'config'   => array(
				'label'       => __( 'WordPress configuration', 'kpf-core' ),
				'description' => __( 'wp-config.php, .htaccess, mu-plugins, and drop-ins (object cache, advanced-cache, etc.).', 'kpf-core' ),
				'group'       => 'config',
			),
		);
	}

	/**
	 * @return array<string, bool>
	 */
	public static function default_selection(): array {
		$out = array();
		foreach ( array_keys( self::definitions() ) as $key ) {
			$out[ $key ] = true;
		}
		return $out;
	}

	/**
	 * @param array<string, bool>|null $selection
	 * @return list<string>
	 */
	public static function selected_keys( ?array $selection = null ): array {
		$selection = is_array( $selection ) ? $selection : Settings::get()['components'];
		$keys      = array();
		foreach ( array_keys( self::definitions() ) as $key ) {
			if ( ! empty( $selection[ $key ] ) ) {
				$keys[] = $key;
			}
		}
		return $keys;
	}
}
