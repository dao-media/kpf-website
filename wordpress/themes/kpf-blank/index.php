<?php
/**
 * Fallback output when WordPress itself serves HTML (admin previews, wrong host, etc.).
 * The public site is rendered by Faust at the configured frontend URI.
 *
 * @package KPF_Blank
 */

declare(strict_types=1);

status_header( 200 );
nocache_headers();

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php echo esc_html( get_bloginfo( 'name' ) ); ?></title>
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<main style="font-family: system-ui, sans-serif; margin: 4rem auto; max-width: 36rem; padding: 0 1.25rem;">
	<h1><?php echo esc_html( get_bloginfo( 'name' ) ); ?></h1>
	<p><?php esc_html_e( 'This WordPress install is headless. Open the Faust frontend to view the public site.', 'kpf-blank' ); ?></p>
	<?php if ( function_exists( 'home_url' ) ) : ?>
		<p><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'WordPress home URL', 'kpf-blank' ); ?></a></p>
	<?php endif; ?>
</main>
<?php wp_footer(); ?>
</body>
</html>
