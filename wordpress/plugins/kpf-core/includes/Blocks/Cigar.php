<?php

declare(strict_types=1);

namespace KPF\Core\Blocks;

use KPF\Core\Scaffold\Media as ScaffoldMedia;

/**
 * Default cigar / smoke attachments for the kpf/cigar block.
 */
final class Cigar {
	/**
	 * @return array{
	 *   cigarId: int,
	 *   cigarUrl: string,
	 *   cigarAlt: string,
	 *   smokeId: int,
	 *   smokeUrl: string
	 * }
	 */
	public static function defaults(): array {
		$cigar = self::attachment( array( 'Cigar.png', 'cigar.png' ) );
		$smoke = self::attachment( array( 'smoke.mp4', 'smoke.webm' ) );

		return array(
			'cigarId'  => $cigar['id'],
			'cigarUrl' => $cigar['url'],
			'cigarAlt' => $cigar['alt'] !== '' ? $cigar['alt'] : __( 'Kevin’s cigar', 'kpf-core' ),
			'smokeId'  => $smoke['id'],
			'smokeUrl' => $smoke['url'],
		);
	}

	/**
	 * @param list<string> $basenames
	 * @return array{id: int, url: string, alt: string}
	 */
	private static function attachment( array $basenames ): array {
		$id = ScaffoldMedia::find_id( $basenames );
		if ( $id < 1 ) {
			return array(
				'id'  => 0,
				'url' => '',
				'alt' => '',
			);
		}

		$url = wp_get_attachment_url( $id );

		return array(
			'id'  => $id,
			'url' => is_string( $url ) ? $url : '',
			'alt' => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
		);
	}
}
