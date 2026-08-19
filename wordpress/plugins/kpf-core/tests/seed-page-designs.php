<?php
/**
 * Seed KPF page designs, contact form, and scaffold media map.
 *
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/seed-page-designs.php
 */

use KPF\Core\Designs\Meta as DesignsMeta;
use KPF\Core\Forms\ContentType as FormsContentType;
use KPF\Core\Forms\Definition as FormsDefinition;
use KPF\Core\Forms\Meta as FormsMeta;
use KPF\Core\Scaffold\DesignHtml;
use KPF\Core\Scaffold\Media as ScaffoldMedia;

wp_set_current_user( 1 );

echo "Syncing scaffold media map...\n";
$map   = ScaffoldMedia::sync_option();
$items = ScaffoldMedia::resolve_items();
$media = DesignHtml::media_map_from_items( $items );
echo 'Media keys: ' . count( $media ) . "\n";
foreach ( $map as $key => $id ) {
	echo "  {$key} => {$id}\n";
}

// Fix Contact page slug contact-2 → contact.
$contact = get_page_by_path( 'contact-2' ) ?: get_page_by_path( 'contact' );
if ( $contact instanceof WP_Post && 'contact' !== $contact->post_name ) {
	wp_update_post(
		array(
			'ID'        => (int) $contact->ID,
			'post_name' => 'contact',
		)
	);
	echo "Renamed Contact page slug to contact (ID {$contact->ID}).\n";
	$contact = get_post( (int) $contact->ID );
}
if ( ! $contact instanceof WP_Post ) {
	$contact_id = wp_insert_post(
		array(
			'post_type'   => 'page',
			'post_status' => 'publish',
			'post_title'  => 'Contact',
			'post_name'   => 'contact',
		),
		true
	);
	$contact = is_wp_error( $contact_id ) ? null : get_post( (int) $contact_id );
	echo $contact ? "Created Contact page (ID {$contact->ID}).\n" : "FAILED to create Contact page.\n";
}

// Ensure Blog page exists (React BlogPageScaffold; no design HTML required).
$blog = get_page_by_path( 'blog' );
if ( ! $blog instanceof WP_Post ) {
	$blog_id = wp_insert_post(
		array(
			'post_type'   => 'page',
			'post_status' => 'publish',
			'post_title'  => 'Blog',
			'post_name'   => 'blog',
		),
		true
	);
	$blog = is_wp_error( $blog_id ) ? null : get_post( (int) $blog_id );
	echo $blog ? "Created Blog page (ID {$blog->ID}).\n" : "FAILED to create Blog page.\n";
} else {
	echo "Blog page ready (ID {$blog->ID}).\n";
}

// Ensure Privacy page exists (React PrivacyPageScaffold).
$privacy = get_page_by_path( 'privacy' );
if ( ! $privacy instanceof WP_Post ) {
	$privacy_id = wp_insert_post(
		array(
			'post_type'   => 'page',
			'post_status' => 'publish',
			'post_title'  => 'Privacy Policy',
			'post_name'   => 'privacy',
		),
		true
	);
	$privacy = is_wp_error( $privacy_id ) ? null : get_post( (int) $privacy_id );
	echo $privacy ? "Created Privacy page (ID {$privacy->ID}).\n" : "FAILED to create Privacy page.\n";
} else {
	echo "Privacy page ready (ID {$privacy->ID}).\n";
}

// Ensure / update contact form.
$form_id = FormsDefinition::find_by_slug( 'contact' );
if ( $form_id < 1 ) {
	$form_id = FormsDefinition::find_by_slug( 'contact-us' );
}
$name_id     = 'fld_name';
$email_id    = 'fld_email';
$phone_id    = 'fld_phone';
$inquiry_id  = 'fld_inquiry';
$message_id  = 'fld_message';
$hear_id     = 'fld_hear';

$contact_definition = array(
	'version'  => FormsMeta::VERSION,
	'status'   => 'active',
	'settings' => array(
		'submitLabel'     => 'Send message',
		'successMessage'  => 'Thanks — we’ve got it. Someone will get back to you within a few days.',
		'captchaMode'     => 'honeypot',
		'notifications'   => array(
			'enabled' => true,
			'emails'  => array(),
		),
	),
	'fields'   => array(
		$name_id    => array_merge(
			FormsMeta::default_field( $name_id, 'short_text', 'Name', 'name', 'half' ),
			array( 'required' => true )
		),
		$email_id   => array_merge(
			FormsMeta::default_field( $email_id, 'email', 'Email', 'email', 'half' ),
			array( 'required' => true )
		),
		$phone_id   => array_merge(
			FormsMeta::default_field( $phone_id, 'tel', 'Phone', 'phone', 'half' ),
			array( 'required' => false )
		),
		$inquiry_id => array_merge(
			FormsMeta::default_field( $inquiry_id, 'select', 'What’s this about?', 'inquiry', 'half' ),
			array(
				'required' => true,
				'options'  => array(
					array( 'label' => 'Volunteering', 'value' => 'volunteer' ),
					array( 'label' => 'Sponsorship or partnership', 'value' => 'partnership' ),
					array( 'label' => 'Donation question', 'value' => 'donation' ),
					array( 'label' => 'Grant inquiry', 'value' => 'grant' ),
					array( 'label' => 'Press or media', 'value' => 'press' ),
					array( 'label' => 'Something else', 'value' => 'other' ),
				),
			)
		),
		$message_id => array_merge(
			FormsMeta::default_field( $message_id, 'long_text', 'Message', 'message', 'full' ),
			array( 'required' => true )
		),
		$hear_id    => array_merge(
			FormsMeta::default_field( $hear_id, 'select', 'How did you hear about us?', 'hear', 'full' ),
			array(
				'required' => false,
				'options'  => array(
					array( 'label' => 'Songwriters for Vets', 'value' => 'sfv' ),
					array( 'label' => 'Social media', 'value' => 'social' ),
					array( 'label' => 'A friend', 'value' => 'friend' ),
					array( 'label' => 'Search', 'value' => 'search' ),
					array( 'label' => 'Other', 'value' => 'other' ),
				),
			)
		),
	),
	'rows'     => array(
		array(
			'id'      => 'row_1',
			'columns' => 2,
			'slots'   => array( array( $name_id ), array( $email_id ) ),
			'fields'  => array( $name_id, $email_id ),
		),
		array(
			'id'      => 'row_2',
			'columns' => 2,
			'slots'   => array( array( $phone_id ), array( $inquiry_id ) ),
			'fields'  => array( $phone_id, $inquiry_id ),
		),
		array(
			'id'      => 'row_3',
			'columns' => 1,
			'slots'   => array( array( $message_id ) ),
			'fields'  => array( $message_id ),
		),
		array(
			'id'      => 'row_4',
			'columns' => 1,
			'slots'   => array( array( $hear_id ) ),
			'fields'  => array( $hear_id ),
		),
	),
	'conditions' => array(),
);

if ( $form_id < 1 ) {
	$form_id = wp_insert_post(
		array(
			'post_type'   => FormsContentType::POST_TYPE,
			'post_status' => 'publish',
			'post_title'  => 'Contact',
			'post_name'   => 'contact',
		),
		true
	);
	$form_id = is_wp_error( $form_id ) ? 0 : (int) $form_id;
	echo $form_id ? "Created contact form (ID {$form_id}).\n" : "FAILED creating contact form.\n";
} else {
	wp_update_post(
		array(
			'ID'         => $form_id,
			'post_title' => 'Contact',
			'post_name'  => 'contact',
			'post_status'=> 'publish',
		)
	);
	echo "Updated contact form slug/title (ID {$form_id}).\n";
}
if ( $form_id > 0 ) {
	FormsMeta::update( $form_id, $contact_definition );
	echo "Saved contact form definition.\n";
}

/**
 * @param string               $slug Page slug.
 * @param callable             $html_builder fn(array $media): string
 * @param array<string, array> $media
 */
$save_design = static function ( string $slug, callable $html_builder, array $media ): void {
	$page = get_page_by_path( $slug );
	if ( ! $page instanceof WP_Post ) {
		// Front page may be "home" but shown as /.
		if ( 'home' === $slug ) {
			$front = (int) get_option( 'page_on_front' );
			$page  = $front ? get_post( $front ) : null;
		}
	}
	if ( ! $page instanceof WP_Post ) {
		echo "SKIP design: page '{$slug}' not found.\n";
		return;
	}

	$design_id = DesignsMeta::ensure_page_design( (int) $page->ID );
	if ( $design_id < 1 ) {
		echo "FAIL ensure design for {$slug}.\n";
		return;
	}

	$html = (string) $html_builder( $media );
	$payload = DesignsMeta::sanitize_design(
		array(
			'html_filename' => $slug . '.html',
			'html'          => $html,
			'css_filename'  => '',
			'css'           => '',
		)
	);
	update_post_meta( $design_id, DesignsMeta::DESIGN_META, $payload );
	wp_update_post(
		array(
			'ID'          => $design_id,
			'post_status' => 'publish',
			'post_title'  => sprintf( 'Design for %s', get_the_title( $page ) ),
		)
	);

	$ready = DesignsMeta::page_has_design( (int) $page->ID ) ? 'READY' : 'NO';
	echo "Design {$slug}: design_id={$design_id} html_len=" . strlen( $payload['html'] ) . " ready={$ready}\n";
};

$save_design( 'home', array( DesignHtml::class, 'home' ), $media );
$save_design( 'about', array( DesignHtml::class, 'about' ), $media );
$save_design( 'events', array( DesignHtml::class, 'events' ), $media );
$save_design( 'contact', array( DesignHtml::class, 'contact' ), $media );

echo "Done.\n";
