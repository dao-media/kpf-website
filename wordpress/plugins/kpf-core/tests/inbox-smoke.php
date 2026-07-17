<?php
/**
 * Smoke tests for the KPF Inbox (Comments / Forms / Settings).
 *
 * Run with:
 * wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/inbox-smoke.php
 */

use KPF\Core\Inbox\Admin;
use KPF\Core\Inbox\Forms;
use KPF\Core\Inbox\Settings;
use KPF\Core\Inbox\Unread;

$GLOBALS['kpf_inbox_failures'] = 0;

function kpf_inbox_assert(bool $condition, string $message): void {
	if ($condition) {
		echo "PASS: {$message}\n";
		return;
	}

	++$GLOBALS['kpf_inbox_failures'];
	echo "FAIL: {$message}\n";
}

wp_set_current_user(1);

$registry = null;
kpf_inbox_assert(
	(bool) get_post_type_object(Forms::POST_TYPE),
	'Form submission post type is registered'
);

$settings = Settings::all();
kpf_inbox_assert(isset($settings['notifications']['email']), 'Inbox settings expose notification email');
kpf_inbox_assert(array_key_exists('notify_comments', $settings['notifications']), 'Comment notification toggle exists');
kpf_inbox_assert(array_key_exists('notify_forms', $settings['notifications']), 'Form notification toggle exists');

$created = Forms::create_submission(
	array(
		'form_name' => 'Smoke Contact',
		'name'      => 'Test Visitor',
		'email'     => 'visitor@example.org',
		'subject'   => 'Hello Inbox',
		'message'   => 'This is a smoke-test form submission.',
		'fields'    => array( 'Interest' => 'Volunteer' ),
	)
);
kpf_inbox_assert(! is_wp_error($created) && $created > 0, 'Form submissions can be stored');

if (! is_wp_error($created) && $created > 0) {
	$meta = Forms::get_meta((int) $created);
	kpf_inbox_assert('Smoke Contact' === $meta['form_name'], 'Submission stores the form name');
	kpf_inbox_assert('visitor@example.org' === $meta['email'], 'Submission stores the submitter email');
	kpf_inbox_assert(! $meta['is_read'], 'New submissions start unread');
	kpf_inbox_assert(Unread::forms() >= 1, 'Unread form counter includes new submissions');

	Forms::mark_read((int) $created, true);
	kpf_inbox_assert(Forms::is_read((int) $created), 'Submissions can be marked read');

	Forms::mark_read((int) $created, false);
	kpf_inbox_assert(! Forms::is_read((int) $created), 'Submissions can be marked unread again');

	wp_delete_post((int) $created, true);
}

// Build admin menus the same way WordPress does during an admin request.
require_once ABSPATH . 'wp-admin/includes/admin.php';
global $menu, $submenu, $_wp_real_parent_file, $_wp_submenu_nopriv, $_registered_pages, $_parent_pages;
$menu                 = array();
$submenu              = array();
$_wp_real_parent_file = array();
$_wp_submenu_nopriv   = array();
$_registered_pages    = array();
$_parent_pages        = array();
set_current_screen('dashboard');
do_action('admin_menu');

global $menu, $submenu;

$inbox_item = null;
$comments_top = null;
foreach ((array) $menu as $item) {
	if (($item[2] ?? '') === Admin::MENU_SLUG) {
		$inbox_item = $item;
	}
	if (($item[2] ?? '') === 'edit-comments.php') {
		$comments_top = $item;
	}
}

kpf_inbox_assert(null !== $inbox_item, 'Inbox appears as a top-level admin menu');
kpf_inbox_assert(null === $comments_top, 'Default Comments top-level menu is removed');
kpf_inbox_assert(
	is_string($inbox_item[0] ?? null) && str_contains((string) $inbox_item[0], 'Inbox'),
	'Top-level menu is labeled Inbox'
);

$children = $submenu[ Admin::MENU_SLUG ] ?? array();
$slugs    = array_map(static fn ($item) => (string) ( $item[2] ?? '' ), $children);

kpf_inbox_assert(in_array('edit-comments.php', $slugs, true), 'Comments is nested under Inbox');
kpf_inbox_assert(
	in_array('edit.php?post_type=' . Forms::POST_TYPE, $slugs, true),
	'Forms is nested under Inbox'
);
kpf_inbox_assert(in_array(Admin::SETTINGS_SLUG, $slugs, true), 'Settings is nested under Inbox');
kpf_inbox_assert(
	! in_array(Admin::MENU_SLUG, $slugs, true),
	'Duplicate Inbox parent submenu is removed'
);

$pending_before = Unread::comments();
$post_id        = wp_insert_post(
	array(
		'post_title'  => 'Inbox smoke post',
		'post_status' => 'publish',
		'post_type'   => 'post',
	),
	true
);
kpf_inbox_assert(! is_wp_error($post_id) && $post_id > 0, 'A post exists for pending comment tests');

$comment_id = 0;
if (! is_wp_error($post_id) && $post_id > 0) {
	$comment_id = wp_insert_comment(
		array(
			'comment_post_ID'      => (int) $post_id,
			'comment_author'       => 'Inbox Smoke',
			'comment_author_email' => 'smoke@example.org',
			'comment_content'      => 'Pending smoke comment for unread badge.',
			'comment_approved'     => 0,
			'comment_type'         => 'comment',
		)
	);
	wp_cache_delete('comments-0', 'counts');
	wp_cache_delete('comments-' . (int) $post_id, 'counts');
}

kpf_inbox_assert((bool) $comment_id, 'Pending comments can be created for unread counting');
if ($comment_id) {
	kpf_inbox_assert(Unread::comments() === $pending_before + 1, 'Pending comments increase the unread comment count');
	wp_delete_comment((int) $comment_id, true);
}
if (! is_wp_error($post_id) && $post_id > 0) {
	wp_delete_post((int) $post_id, true);
}

if ($GLOBALS['kpf_inbox_failures'] > 0) {
	echo "Completed with {$GLOBALS['kpf_inbox_failures']} failure(s).\n";
	exit(1);
}

echo "All Inbox smoke tests passed.\n";
