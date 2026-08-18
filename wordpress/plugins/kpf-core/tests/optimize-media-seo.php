<?php
/**
 * One-shot: optimize Media Library title / caption / description / alt for SEO + AI retrieval.
 * Run (wp-env):
 *   npx wp-env run cli wp eval-file wp-content/plugins/kpf-core/tests/optimize-media-seo.php
 *
 * Updates title (post_title), caption (post_excerpt), description (post_content),
 * and alt (_wp_attachment_image_alt) keyed by attachment basename.
 */

/**
 * @return array<string, array{title:string,caption:string,description:string,alt:string}>
 */
function kpf_media_seo_catalog(): array {
	$org = 'Kevin Popke Foundation';
	$kevin = 'Donald “Kevin” Popke';
	$tampa = 'Tampa Bay, Florida';

	return array(
		// —— Scrapbook / portrait
		'KP_helicopter.png' => array(
			'title'       => 'Kevin Popke in flight gear aboard a helicopter',
			'caption'     => "{$kevin} in flight gear during military service — remembered by the {$org}.",
			'description' => "{$kevin} (“50”), U.S. Army First Sergeant and Airborne Ranger, photographed in flight gear aboard a helicopter. Historical portrait used by the {$org}, a {$tampa} nonprofit that funds veteran-focused charities in Kevin’s honor.",
			'alt'         => 'Kevin Popke in flight gear aboard a helicopter',
		),
		'SFHF.png' => array(
			'title'       => 'Southeastern Florida High Flyers — Kevin Popke Foundation grantee',
			'caption'     => "Southeastern Florida High Flyers, a veteran-focused organization supported by {$org} grants.",
			'description' => "Logo or program mark for Southeastern Florida High Flyers, a Florida veteran-serving organization and {$org} grant recipient. The Foundation awards targeted grants to nonprofits helping veterans across {$tampa} and Florida.",
			'alt'         => 'Southeastern Florida High Flyers logo, Kevin Popke Foundation grantee',
		),

		// —— Grantee / recipient marks (check & logo variants)
		'13c789_d173c6faa0394916ace0cecdb1ba684amv2.jpg' => array(
			'title'       => "My Warrior’s Place — Kevin Popke Foundation grantee",
			'caption'     => "My Warrior’s Place, a healing retreat for veterans and Gold Star families supported by {$org}.",
			'description' => "Visual for My Warrior’s Place, a Florida nonprofit offering peaceful retreat and community for veterans and Gold Star families. Featured as a {$org} grantee serving {$tampa} and surrounding communities.",
			'alt'         => "My Warrior’s Place, Kevin Popke Foundation grantee",
		),
		'Stano-color1.png' => array(
			'title'       => 'The STANO Foundation — Kevin Popke Foundation grantee',
			'caption'     => "The STANO Foundation supports veterans and first responders across Florida with help from {$org} grants.",
			'description' => "Brand mark for The STANO Foundation, a Florida nonprofit supporting veterans and first responders through community programs. Recognized as a {$org} grant recipient.",
			'alt'         => 'The STANO Foundation logo, Kevin Popke Foundation grantee',
		),
		'OtherSideoftheDunes-1.jpg' => array(
			'title'       => 'Other Side of the Dunes — Kevin Popke Foundation grantee',
			'caption'     => "Other Side of the Dunes builds community for veterans and first responders through golf — a {$org} grantee.",
			'description' => "Visual for Other Side of the Dunes, a Florida organization that builds community for veterans and first responders through golf events honoring service members. Supported by targeted grants from the {$org}.",
			'alt'         => 'Other Side of the Dunes, Kevin Popke Foundation grantee',
		),
		'FreedomRidingAcademy.jpg' => array(
			'title'       => 'Freedom Riding Academy — Kevin Popke Foundation grantee',
			'caption'     => "Freedom Riding Academy provides advanced motorcycle skills training for service members, veterans, and first responders.",
			'description' => "Visual for Freedom Riding Academy, a Florida nonprofit offering advanced motorcycle skills training for service members, veterans, and first responders. Featured as a {$org} grant recipient.",
			'alt'         => 'Freedom Riding Academy, Kevin Popke Foundation grantee',
		),
		'images-16.jpg' => array(
			'title'       => 'Wounded Veterans Relief Fund — Kevin Popke Foundation grantee',
			'caption'     => "Wounded Veterans Relief Fund delivers emergency financial help for veterans’ families — supported by {$org}.",
			'description' => "Visual for Wounded Veterans Relief Fund, which provides emergency financial support for veterans’ families, including Special Operations families in crisis. Recognized as a {$org} grantee in Florida.",
			'alt'         => 'Wounded Veterans Relief Fund, Kevin Popke Foundation grantee',
		),
		'WoundedWarriors_09-2018.png' => array(
			'title'       => 'Wounded Warriors Abilities Ranch grant — September 2018',
			'caption'     => "{$org} grant support for Wounded Warriors Abilities Ranch (September 2018).",
			'description' => "Grant or program documentation image from September 2018 for Wounded Warriors Abilities Ranch, which offers equine and outdoor programs helping wounded veterans rebuild strength and connection. Funded in part by the {$org}.",
			'alt'         => 'Wounded Warriors Abilities Ranch, Kevin Popke Foundation grantee, September 2018',
		),
		'OtherSideoftheDunes.png' => array(
			'title'       => 'Other Side of the Dunes grant mark — Kevin Popke Foundation',
			'caption'     => "Other Side of the Dunes, a Florida veteran and first-responder community organization funded by {$org}.",
			'description' => "Program mark for Other Side of the Dunes, a {$org} grant recipient that builds community for veterans and first responders through golfing events honoring service members across Florida.",
			'alt'         => 'Other Side of the Dunes logo, Kevin Popke Foundation grantee',
		),
		'MyWarriorsPlace_11-2023.png' => array(
			'title'       => "My Warrior’s Place grant — November 2023",
			'caption'     => "{$org} grant support for My Warrior’s Place (November 2023).",
			'description' => "Grant documentation from November 2023 for My Warrior’s Place, a peaceful retreat promoting healing and community for veterans and Gold Star families. Awarded by the {$org} in {$tampa}.",
			'alt'         => "My Warrior’s Place, Kevin Popke Foundation grantee, November 2023",
		),
		'MyWarriorsPlace_03-2025.png' => array(
			'title'       => "My Warrior’s Place grant — March 2025",
			'caption'     => "{$org} grant support for My Warrior’s Place (March 2025).",
			'description' => "Grant documentation from March 2025 for My Warrior’s Place, supporting healing retreats for veterans and Gold Star families. Part of the {$org}’s Florida veteran grant program.",
			'alt'         => "My Warrior’s Place, Kevin Popke Foundation grantee, March 2025",
		),
		'FreedomRidingAcademy.png' => array(
			'title'       => 'Freedom Riding Academy grant mark — Kevin Popke Foundation',
			'caption'     => "Freedom Riding Academy motorcycle skills training for veterans — funded by {$org} grants.",
			'description' => "Program mark for Freedom Riding Academy, a {$org} grant recipient providing advanced motorcycle skills training for service members, veterans, and first responders in Florida.",
			'alt'         => 'Freedom Riding Academy logo, Kevin Popke Foundation grantee',
		),
		'WoundedWarriors_12-2023-1.png' => array(
			'title'       => 'Wounded Warriors Abilities Ranch grant — December 2023',
			'caption'     => "{$org} grant support for Wounded Warriors Abilities Ranch (December 2023).",
			'description' => "Grant documentation from December 2023 for Wounded Warriors Abilities Ranch equine and outdoor veteran programs. Awarded by the {$org} to strengthen recovery and connection for wounded veterans in Florida.",
			'alt'         => 'Wounded Warriors Abilities Ranch, Kevin Popke Foundation grantee, December 2023',
		),
		'StanoFoundation_12-2023.png' => array(
			'title'       => 'The STANO Foundation grant — December 2023',
			'caption'     => "{$org} grant support for The STANO Foundation (December 2023).",
			'description' => "Grant documentation from December 2023 for The STANO Foundation’s community programs serving veterans and first responders across Florida. Funded by the {$org}.",
			'alt'         => 'The STANO Foundation, Kevin Popke Foundation grantee, December 2023',
		),
		'WoundedWarriorsAbilitiesRanch.jpg' => array(
			'title'       => 'Wounded Warriors Abilities Ranch — Kevin Popke Foundation grantee',
			'caption'     => "Wounded Warriors Abilities Ranch helps wounded veterans through equine and outdoor programs — a {$org} grantee.",
			'description' => "Visual for Wounded Warriors Abilities Ranch, offering equine therapy and outdoor programs that help wounded veterans rebuild strength and connection. Supported by targeted grants from the {$org}.",
			'alt'         => 'Wounded Warriors Abilities Ranch, Kevin Popke Foundation grantee',
		),

		// —— Site scaffold media
		'hero.jpg' => array(
			'title'       => 'Kevin Popke Foundation event crowd — homepage hero',
			'caption'     => "Guests gather at a {$org} fundraising event supporting Florida veterans.",
			'description' => "Homepage hero photograph of guests at a {$org} event. The Foundation raises funds in {$tampa} and grants them to vetted veteran-focused nonprofits across Florida, continuing the legacy of {$kevin}.",
			'alt'         => 'Crowd gathered at a Kevin Popke Foundation fundraising event',
		),
		'kevin.jpg' => array(
			'title'       => 'Donald Kevin Popke in U.S. Army uniform',
			'caption'     => "{$kevin} (“50”), retired U.S. Army First Sergeant — namesake of the {$org}.",
			'description' => "Portrait of {$kevin} (“50”) in U.S. Army uniform. Kevin was a retired First Sergeant, Airborne Ranger, and Department of Defense contractor. The {$org} in {$tampa} funds veteran charities in his honor after his life was cut short by a distracted driver.",
			'alt'         => 'Donald “Kevin” Popke in U.S. Army uniform',
		),
		'programs.jpg' => array(
			'title'       => 'Kevin Popke Foundation programs and grant events',
			'caption'     => "Atmosphere from {$org} programs that fund Florida veteran nonprofits.",
			'description' => "Supporting homepage photograph for {$org} programs and grant storytelling. Shows the community atmosphere behind fundraising events that power grants to veteran-focused organizations in {$tampa} and Florida.",
			'alt'         => 'Atmosphere at a Kevin Popke Foundation community program event',
		),
		'dunes.png' => array(
			'title'       => 'Other Side of the Dunes landscape — homepage programs layer',
			'caption'     => "Dunes landscape motif linked to Other Side of the Dunes, a {$org} partner grantee.",
			'description' => "Soft-edged dunes landscape cutout used on the {$org} homepage programs section. Evokes Other Side of the Dunes, a Florida grantee building community for veterans and first responders.",
			'alt'         => 'Soft-edged dunes landscape cutout for Kevin Popke Foundation programs',
		),
		'tampa-bay.png' => array(
			'title'       => 'Tampa Bay aerial view — About page backdrop',
			'caption'     => "Aerial Tampa Bay backdrop for the {$org} About story.",
			'description' => "Soft-edged aerial cutout of {$tampa}, home of the {$org}. Used behind the About page hero to ground the Foundation’s local mission: targeted grants to veteran-focused charities in Tampa Bay and across Florida.",
			'alt'         => 'Aerial cutout of Tampa Bay, Florida',
		),
		'hero-frame.png' => array(
			'title'       => 'Kevin Popke portrait cutout — About page hero frame',
			'caption'     => "Framed cutout portrait of {$kevin} on the About page hero.",
			'description' => "Isolated cutout portrait of {$kevin} for the {$org} About page hero. Introduces the Foundation’s namesake — a U.S. Army First Sergeant whose life of service inspires grants to Florida veteran nonprofits.",
			'alt'         => 'Cutout portrait of Kevin Popke in a wooden frame',
		),
		'history-front.png' => array(
			'title'       => 'Kevin Popke portrait — Who Kevin was carousel',
			'caption'     => "{$kevin}, remembered through the {$org} “Who Kevin was” story.",
			'description' => "Portrait cutout of {$kevin} used in the About page “Who Kevin was” history carousel. Kevin served as a U.S. Army First Sergeant and Airborne Ranger; the {$org} continues his commitment to fellow veterans in {$tampa}.",
			'alt'         => 'Donald “Kevin” Popke portrait cutout',
		),
		'history-1.png' => array(
			'title'       => 'Kevin and Michelle Popke — Who Kevin was carousel',
			'caption'     => "{$kevin} with his wife Michelle — part of the Foundation’s remembrance story.",
			'description' => "Cutout photograph of {$kevin} with his wife Michelle for the About page history carousel. Personal context for the {$org}, which funds Florida veteran charities in Kevin’s honor.",
			'alt'         => 'Donald “Kevin” Popke with his wife Michelle',
		),
		'history-2.png' => array(
			'title'       => 'Kevin Popke running — Who Kevin was carousel',
			'caption'     => "{$kevin} as a runner and athlete — part of the “Who Kevin was” remembrance.",
			'description' => "Running cutout of {$kevin} for the About page history carousel. Highlights Kevin’s active life beyond military service. Featured by the {$org} in {$tampa}.",
			'alt'         => 'Donald “Kevin” Popke running',
		),
		'history-back.png' => array(
			'title'       => 'Kevin Popke alumni portrait — Who Kevin was carousel',
			'caption'     => "Alumni-era portrait of {$kevin} in the Foundation history carousel.",
			'description' => "Companion alumni-style cutout of {$kevin} for the About page “Who Kevin was” stacked carousel. Part of the visual remembrance that introduces the {$org}’s mission for Florida veterans.",
			'alt'         => 'Donald “Kevin” Popke alumni portrait cutout',
		),
		'hero-1.jpg' => array(
			'title'       => 'Songwriters for Vets atmosphere — Events page hero',
			'caption'     => "Nighttime atmosphere from Songwriters for Vets, the {$org}’s flagship fundraiser.",
			'description' => "Events page hero photograph capturing Songwriters for Vets atmosphere. Songwriters for Vets is the largest annual source of grant funding for the {$org}, supporting veteran nonprofits across Florida.",
			'alt'         => 'Atmospheric stage lighting at a Songwriters for Vets fundraising event',
		),
		'featured.jpg' => array(
			'title'       => 'Songwriters for Vets featured event photograph',
			'caption'     => "Songwriters for Vets — the {$org}’s largest source of grant support each year.",
			'description' => "Featured Events photograph from Songwriters for Vets, the flagship fundraising concert of the {$org}. Ticket and sponsorship proceeds fund targeted grants to veteran-focused charities in {$tampa} and Florida.",
			'alt'         => 'Featured photograph from Songwriters for Vets fundraising concert',
		),
		'library-1.jpg' => array(
			'title'       => 'Songwriters for Vets gallery — past event evening',
			'caption'     => "Guests and performers at a past Songwriters for Vets evening for the {$org}.",
			'description' => "Events gallery photograph from a Songwriters for Vets evening. Documents the community fundraising that powers {$org} grants to Florida veteran organizations.",
			'alt'         => 'Guests at a Songwriters for Vets evening for the Kevin Popke Foundation',
		),

		// —— Partner logos (homepage strip)
		'Freedom_Riding_Academy.jpg' => array(
			'title'       => 'Freedom Riding Academy partner logo',
			'caption'     => "Freedom Riding Academy — {$org} community partner and grantee.",
			'description' => "Official logo for Freedom Riding Academy, a Florida nonprofit providing motorcycle skills training for service members, veterans, and first responders. Displayed as a {$org} partner and grant recipient.",
			'alt'         => 'Freedom Riding Academy logo',
		),
		'My_Warriors_Place.jpg' => array(
			'title'       => "My Warrior’s Place partner logo",
			'caption'     => "My Warrior’s Place — {$org} community partner and grantee.",
			'description' => "Official logo for My Warrior’s Place, offering healing retreats for veterans and Gold Star families. Displayed as a {$org} partner organization in {$tampa} / Florida.",
			'alt'         => "My Warrior’s Place logo",
		),
		'Other_Side_of_the_Dunes.jpg' => array(
			'title'       => 'Other Side of the Dunes partner logo',
			'caption'     => "Other Side of the Dunes — {$org} community partner and grantee.",
			'description' => "Official logo for Other Side of the Dunes, building community for veterans and first responders through golf. Featured in the {$org} partners strip.",
			'alt'         => 'Other Side of the Dunes logo',
		),
		'The_Stano_Foundation.png' => array(
			'title'       => 'The STANO Foundation partner logo',
			'caption'     => "The STANO Foundation — {$org} community partner and grantee.",
			'description' => "Official logo for The STANO Foundation, supporting veterans and first responders through Florida community programs. Featured as a {$org} partner.",
			'alt'         => 'The STANO Foundation logo',
		),
		'Wounded_Veterans_Relief_Fund.jpg' => array(
			'title'       => 'Wounded Veterans Relief Fund partner logo',
			'caption'     => "Wounded Veterans Relief Fund — {$org} community partner and grantee.",
			'description' => "Official logo for Wounded Veterans Relief Fund, providing emergency financial help for veterans’ families including Special Operations families. Featured as a {$org} partner.",
			'alt'         => 'Wounded Veterans Relief Fund logo',
		),
		'Wounded_Warriors_Abilities_Ranch.webp' => array(
			'title'       => 'Wounded Warriors Abilities Ranch partner logo',
			'caption'     => "Wounded Warriors Abilities Ranch — {$org} community partner and grantee.",
			'description' => "Official logo for Wounded Warriors Abilities Ranch, offering equine and outdoor programs for wounded veterans. Featured as a {$org} partner organization.",
			'alt'         => 'Wounded Warriors Abilities Ranch logo',
		),

		// —— Homepage Kevin media
		'kevin-double-exposure.jpg' => array(
			'title'       => 'Kevin Popke double-exposure portrait with parachutist',
			'caption'     => "Artistic double-exposure of {$kevin} with a parachutist silhouette — Airborne legacy.",
			'description' => "Double-exposure portrait of {$kevin} combined with a parachutist silhouette, reflecting his Airborne Ranger service. Used on the {$org} homepage “Who is Kevin Popke?” story in {$tampa}.",
			'alt'         => 'Double-exposure portrait of Kevin Popke with a parachutist silhouette',
		),
		'kevin-double-exposure.png' => array(
			'title'       => 'Kevin Popke double-exposure cutout with parachutist',
			'caption'     => "Transparent double-exposure cutout of {$kevin} with parachutist silhouette for homepage storytelling.",
			'description' => "Transparent PNG double-exposure of {$kevin} with a parachutist silhouette for the {$org} homepage. Visual metaphor for Kevin’s Airborne service and the Foundation’s veteran mission in Florida.",
			'alt'         => 'Cutout double-exposure of Kevin Popke with parachutist silhouette',
		),
		'programs-collage-beach.jpg' => array(
			'title'       => 'Kevin Popke Foundation beach flag — programs collage',
			'caption'     => "Beach flag moment from a {$org} community program day.",
			'description' => "Programs collage photograph of a beach flag at a {$org} community gathering. Illustrates outdoor fundraising and fellowship that support grants to Florida veteran nonprofits.",
			'alt'         => 'Beach flag at a Kevin Popke Foundation community program',
		),
		'programs-collage-bbq.jpg' => array(
			'title'       => 'Kevin Popke Foundation BBQ tents — programs collage',
			'caption'     => "BBQ tents and outdoor gathering at a {$org} community fundraiser.",
			'description' => "Programs collage photograph of BBQ tents at a {$org} outdoor gathering. Shows the community fundraising culture behind grants to veteran-focused charities in {$tampa}.",
			'alt'         => 'BBQ tents at a Kevin Popke Foundation outdoor fundraiser',
		),
		'kevin-with-dad.png' => array(
			'title'       => 'Kevin Popke with his father — homepage cutout',
			'caption'     => "{$kevin} with his father — family portrait cutout for the Foundation homepage.",
			'description' => "Transparent cutout of {$kevin} with his father for {$org} homepage storytelling. Personal family context for the Foundation named in Kevin’s memory, serving veterans in {$tampa} and Florida.",
			'alt'         => 'Kevin Popke standing with his father',
		),
		'kevin-runner.png' => array(
			'title'       => 'Kevin Popke running — homepage cutout',
			'caption'     => "{$kevin} as a runner — athletic cutout for the Foundation homepage.",
			'description' => "Transparent running cutout of {$kevin} for the {$org} homepage. Highlights Kevin’s athletic life alongside his military service as a U.S. Army First Sergeant.",
			'alt'         => 'Kevin Popke running in athletic gear',
		),
		'kevin-runner-scaled.png' => array(
			'title'       => 'Kevin Popke running — homepage cutout (scaled)',
			'caption'     => "{$kevin} as a runner — scaled athletic cutout for the Foundation homepage.",
			'description' => "Scaled transparent running cutout of {$kevin} for responsive {$org} homepage layouts. Part of the visual story introducing Kevin’s life of service and the Foundation’s Florida veteran grants.",
			'alt'         => 'Kevin Popke running in athletic gear',
		),
		'kevin-alumni.png' => array(
			'title'       => 'Kevin Popke alumni portrait — homepage cutout',
			'caption'     => "Alumni-style portrait cutout of {$kevin} for the Foundation homepage.",
			'description' => "Transparent alumni portrait cutout of {$kevin} used on the {$org} homepage. Complements the remembrance narrative that drives grants to veteran charities across Florida.",
			'alt'         => 'Kevin Popke alumni portrait cutout',
		),

		// —— Cigar block
		'Cigar.png' => array(
			'title'       => 'Kevin Popke’s cigar — memorial detail illustration',
			'caption'     => "Illustrated cigar detail associated with {$kevin} (“50”), a signature of his personality.",
			'description' => "Illustrated cigar graphic used as a memorial personality detail for {$kevin} on the {$org} site. A small, humanizing cue within the broader story of a U.S. Army First Sergeant whose legacy funds Florida veteran grants.",
			'alt'         => 'Illustrated cigar associated with Kevin Popke',
		),
		'smoke.mp4' => array(
			'title'       => 'Cigar smoke animation — Kevin Popke memorial detail',
			'caption'     => "Soft smoke motion paired with Kevin’s cigar illustration on the {$org} site.",
			'description' => "Looping smoke video used with the cigar illustration memorializing {$kevin}. Ambient motion detail on the {$org} website; decorative accompaniment to Kevin’s remembrance story.",
			'alt'         => 'Soft looping cigar smoke animation',
		),
		'kpf-flag.mp4' => array(
			'title'       => 'American flag motion — closing CTA background',
			'caption'     => "Soft American flag motion used behind closing call-to-action bands on the {$org} site.",
			'description' => "Looping American flag video used as a full-bleed background fill for closing CTA sections on the {$org} website. Decorative motion behind invitations to donate or get in touch, in honor of {$kevin} and the Foundation’s veteran mission in {$tampa}.",
			'alt'         => 'Soft looping American flag background animation',
		),

		// —— Kevin CPT carousel frames (1120×1296)
		'kevin-alumni_1120x1296.png' => array(
			'title'       => 'Kevin Popke alumni portrait — history slide',
			'caption'     => "Alumni portrait of {$kevin} for the About “Who Kevin was” slider.",
			'description' => "1120×1296 portrait frame of {$kevin} in an alumni-style setting for the {$org} Kevin slides carousel. Structured for About page storytelling about the Foundation’s namesake and Florida veteran mission.",
			'alt'         => 'Donald “Kevin” Popke alumni portrait for history carousel',
		),
		'kevin-and-dad_1120x1296.png' => array(
			'title'       => 'Kevin Popke with his father — history slide',
			'caption'     => "{$kevin} with his father — framed for the About history slider.",
			'description' => "1120×1296 framed photograph of {$kevin} with his father for the {$org} Kevin slides / About history carousel. Family context for the Foundation’s remembrance of a U.S. Army First Sergeant from {$tampa}.",
			'alt'         => 'Donald “Kevin” Popke with his father',
		),
		'kevin-and-wife_1120x1296.png' => array(
			'title'       => 'Kevin and Michelle Popke — history slide',
			'caption'     => "{$kevin} with his wife Michelle — framed for the About history slider.",
			'description' => "1120×1296 framed photograph of {$kevin} and Michelle Popke for the {$org} Kevin slides carousel on the About page. Personal remembrance supporting the Foundation’s veteran grant mission.",
			'alt'         => 'Donald “Kevin” Popke with his wife Michelle',
		),
		'kevin-army_1120x1296.png' => array(
			'title'       => 'Kevin Popke in Army uniform — history slide',
			'caption'     => "{$kevin} in U.S. Army uniform — framed for the About history slider.",
			'description' => "1120×1296 framed portrait of {$kevin} in U.S. Army uniform for the {$org} Kevin slides carousel. Emphasizes his service as First Sergeant and Airborne Ranger — the service the Foundation honors through Florida veteran grants.",
			'alt'         => 'Donald “Kevin” Popke in U.S. Army uniform',
		),
		'kevin-runner_1120x1296.png' => array(
			'title'       => 'Kevin Popke running — history slide',
			'caption'     => "{$kevin} running — framed athletic portrait for the About history slider.",
			'description' => "1120×1296 framed athletic photograph of {$kevin} running for the {$org} Kevin slides carousel. Complements military portraits with Kevin’s life as a runner and community presence in Florida.",
			'alt'         => 'Donald “Kevin” Popke running',
		),
	);
}

$catalog = kpf_media_seo_catalog();
$posts   = get_posts(
	array(
		'post_type'      => 'attachment',
		'posts_per_page' => -1,
		'post_status'    => 'inherit',
		'orderby'        => 'ID',
		'order'          => 'ASC',
	)
);

$updated = 0;
$skipped = 0;
$missing = array();

foreach ( $posts as $post ) {
	$file     = (string) get_post_meta( $post->ID, '_wp_attached_file', true );
	$basename = basename( $file );
	if ( ! isset( $catalog[ $basename ] ) ) {
		$missing[] = $post->ID . ' ' . $basename;
		++$skipped;
		continue;
	}

	$meta = $catalog[ $basename ];
	wp_update_post(
		array(
			'ID'           => $post->ID,
			'post_title'   => $meta['title'],
			'post_excerpt' => $meta['caption'],
			'post_content' => $meta['description'],
		)
	);
	update_post_meta( $post->ID, '_wp_attachment_image_alt', $meta['alt'] );
	++$updated;
	echo "OK {$post->ID} {$basename}\n";
}

echo "updated={$updated} skipped={$skipped}\n";
if ( $missing ) {
	echo "MISSING:\n" . implode( "\n", $missing ) . "\n";
}
