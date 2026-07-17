<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

final class Registry {
	public const SCRIPT_HANDLE = 'kpf-components-editor';
	public const STYLE_HANDLE  = 'kpf-components';

	private const BLOCKS = array(
		'button',
		'disclosure',
		'card',
		'notice',
		'call-to-action',
		'container',
	);

	public static function register(): void {
		add_action('init', array( self::class, 'register_blocks' ), 20);
		add_filter('block_categories_all', array( self::class, 'block_category' ), 10, 2);
	}

	public static function register_blocks(): void {
		$asset_file = KPF_CORE_PATH . 'build/components.asset.php';
		$asset      = is_readable($asset_file)
			? require $asset_file
			: array(
				'dependencies' => array(
					'wp-block-editor',
					'wp-blocks',
					'wp-components',
					'wp-compose',
					'wp-core-data',
					'wp-data',
					'wp-editor',
					'wp-element',
					'wp-i18n',
					'wp-plugins',
				),
				'version'      => KPF_CORE_VERSION,
			);

		wp_register_script(
			self::SCRIPT_HANDLE,
			KPF_CORE_URL . 'build/components.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_register_style(
			self::STYLE_HANDLE,
			KPF_CORE_URL . 'build/components.css',
			array( 'wp-edit-blocks' ),
			$asset['version']
		);

		foreach (self::BLOCKS as $block) {
			$metadata_path = KPF_CORE_PATH . 'blocks/' . $block;
			if (! is_readable($metadata_path . '/block.json')) {
				continue;
			}

			register_block_type_from_metadata(
				$metadata_path,
				array(
					'editor_script_handles' => array( self::SCRIPT_HANDLE ),
					'editor_style_handles'  => array( self::STYLE_HANDLE ),
				)
			);
		}
	}

	/**
	 * @param array<int, array<string, string>> $categories
	 * @param mixed                             $editor_context
	 * @return array<int, array<string, string>>
	 */
	public static function block_category(array $categories, $editor_context): array {
		unset($editor_context);
		array_unshift(
			$categories,
			array(
				'slug'  => 'kpf-components',
				'title' => __('Foundation Components', 'kpf-core'),
				'icon'  => 'layout',
			)
		);

		return $categories;
	}

	/**
	 * @return array<int, string>
	 */
	public static function block_names(): array {
		return array_map(
			static fn (string $name): string => 'kpf/' . $name,
			self::BLOCKS
		);
	}
}
