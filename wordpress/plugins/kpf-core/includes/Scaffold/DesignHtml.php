<?php

declare(strict_types=1);

namespace KPF\Core\Scaffold;

/**
 * HTML templates for Pages → Designs, using Media Library URLs.
 */
final class DesignHtml {
	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function home( array $media ): string {
		$cutout_dad    = self::cutout( $media, 'home.kevinDad', 'kpf-hero__cutout kpf-hero__cutout--dad' );
		$cutout_alumni = self::cutout( $media, 'home.kevinAlumni', 'kpf-hero__cutout kpf-hero__cutout--alumni' );
		$cutout_runner = self::cutout( $media, 'home.kevinRunner', 'kpf-hero__cutout kpf-hero__cutout--runner' );
		$kevin    = self::img( $media, 'home.kevinDoubleExposure', 'Double-exposure portrait of Kevin Popke with a parachutist silhouette', '' );
		if ( $kevin === '' ) {
			$kevin = self::img( $media, 'home.kevin', 'Donald “Kevin” Popke in uniform', '' );
		}
		$dunes    = self::img( $media, 'home.dunes', '', 'kpf-programs__dunes' );
		$card1    = self::img( $media, 'home.hero', '', '' );
		$card2    = self::img( $media, 'events.featured1', 'Songwriters for Vets performers on stage with an American flag', '' );
		$card3    = self::img( $media, 'events.library1', '', '' );
		$card4    = self::img( $media, 'home.programs', '', '' );
		$collage1 = self::img( $media, 'home.programsCollageBeach', '', '' );
		$collage2 = self::img( $media, 'home.programsCollageBbq', '', '' );
		$blog     = self::img( $media, 'events.library1', '', 'kpf-archive__thumb' );

		$donate_btn = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' );
		$donate_sm = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary kpf-btn--sm' );
		$check = '<span class="kpf-programs__check" aria-hidden="true">' . ChromeHtml::check_svg( 28 ) . '</span>';

		return <<<HTML
<div class="kpf-page-home" data-kpf-scaffold="home">
  <section class="kpf-hero kpf-hero--home" aria-labelledby="kpf-home-hero-title">
    <div class="kpf-hero__scrim" aria-hidden="true"></div>
    <div class="kpf-hero__stage" aria-hidden="true">{$cutout_dad}{$cutout_alumni}{$cutout_runner}</div>
    <div class="kpf-u-container kpf-hero__layout">
      <div class="kpf-hero__content">
        <div class="kpf-content-block kpf-u-invert">
          <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Veteran grants across Tampa Bay &amp; Florida</p>
            <h1 id="kpf-home-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">We fund organizations showing up for vets.</h1>
          </div>
            <div class="kpf-content-block__body-group">
          <p class="kpf-content-block__body">The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits in Tampa Bay and across Florida — the small organizations doing the hardest work, closest to the ground.</p>
            </div>
          </div>
          <div class="kpf-content-block__actions kpf-hero__actions">
            {$donate_btn}
            <a class="kpf-link kpf-hero__text-link" href="/#programs">Where your donations go</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  {{partners-slider}}

  <section class="kpf-story kpf-section" aria-labelledby="kpf-home-story-title">
    <div class="kpf-story__media">{$kevin}</div>
    <div class="kpf-u-container kpf-story__inner">
      <div class="kpf-story__copy">
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Preserving His Legacy</p>
            <h2 id="kpf-home-story-title" class="kpf-content-block__title kpf-content-block__title--h2">Who is Kevin Popke?</h2>
          </div>
            <div class="kpf-content-block__body-group">
          <p class="kpf-content-block__body">Kevin Popke, or “50” to his friends, was a retired U.S. Army First Sergeant, paratrooper, and Department of Defense contractor who lost his life in a car accident caused by a distracted driver.</p>
          <p class="kpf-content-block__body">The Kevin Popke Foundation serves in tribute of Kevin as a veteran-focused organization providing fundraising opportunities to other veteran-focused charities in the Tampa Bay Area and surrounding. Through targeted grants in Kevin’s honor, we support people like him who have served and sacrificed to protect us.</p>
            </div>
          </div>
          <div class="kpf-content-block__actions kpf-story__actions">
            {$donate_btn}
            <button type="button" class="kpf-btn kpf-btn--secondary" data-kpf-href="/about/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Kevin’s story</button>
            <a class="kpf-link" href="/#programs">Where your donation goes</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="kpf-values kpf-section kpf-values--cards" aria-labelledby="kpf-home-values-title">
    <div class="kpf-u-container">
      <div class="kpf-values__intro">
        <h2 id="kpf-home-values-title" class="kpf-h2">Together, we can.</h2>
        <p class="kpf-content-block__body">A nonprofit is only as strong as the community holding it up. There’s more than one way in — pick the one that fits.</p>
      </div>
      <div class="kpf-values__cards">
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card1}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">What You Can Do</p><h3 class="kpf-card__title">Donate to Kevin’s Cause</h3><p class="kpf-card__description">Every dollar goes out as a grant to a Florida organization we’ve vetted ourselves.</p><div class="kpf-card__actions">{$donate_sm}</div></div></article>
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card2}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">What You Can Do</p><h3 class="kpf-card__title">Check out our events</h3><p class="kpf-card__description">Buy a ticket, bring people, have a good night out for a serious reason.</p><div class="kpf-card__actions"><button type="button" class="kpf-btn kpf-btn--primary kpf-btn--sm" data-kpf-href="/events/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">See events</button></div></div></article>
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card3}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">Who We Work With</p><h3 class="kpf-card__title">Songwriters for Vets</h3><p class="kpf-card__description">Each year Nashville songwriters come to play the songs you know by heart.</p><div class="kpf-card__actions"><button type="button" class="kpf-btn kpf-btn--primary kpf-btn--sm" data-kpf-href="/events/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">See events</button></div></div></article>
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card4}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">What You Can Do</p><h3 class="kpf-card__title">Get involved at KPF</h3><p class="kpf-card__description">Volunteer, sponsor an event, or bring the Foundation to your company or community.</p><div class="kpf-card__actions"><button type="button" class="kpf-btn kpf-btn--primary kpf-btn--sm" data-kpf-href="/contact/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Contact us</button></div></div></article>
      </div>
    </div>
  </section>

  <section id="programs" class="kpf-programs kpf-section" aria-labelledby="kpf-home-programs-title">
    <div class="kpf-u-container kpf-programs__inner">
      <div class="kpf-programs__copy">
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Where the money goes</p>
            <h2 id="kpf-home-programs-title" class="kpf-content-block__title kpf-content-block__title--h2">Where your donations go</h2>
          </div>
            <div class="kpf-content-block__body-group">
          <p class="kpf-content-block__body">Every grant goes to a Florida organization we’ve met, vetted, and watched work.</p>
            </div>
          </div>
        </div>
        <ul class="kpf-programs__list">
          <li class="kpf-programs__item">{$check}<div><h3 class="kpf-programs__item-title">Housing</h3><p class="kpf-programs__item-body">Transitional and permanent housing for veterans who don’t currently have any.</p></div></li>
          <li class="kpf-programs__item">{$check}<div><h3 class="kpf-programs__item-title">Work</h3><p class="kpf-programs__item-body">Job training and workforce programs that turn service experience into a career.</p></div></li>
          <li class="kpf-programs__item">{$check}<div><h3 class="kpf-programs__item-title">Health</h3><p class="kpf-programs__item-body">Mental health care and adaptive programs for veterans living with injury.</p></div></li>
        </ul>
      </div>
      <div class="kpf-programs__media">
        {$dunes}
        <div class="kpf-programs__collage">{$collage1}{$collage2}</div>
      </div>
    </div>
  </section>

  <section class="kpf-archive kpf-section" aria-labelledby="kpf-home-blog-title">
    <div class="kpf-u-container kpf-archive__inner">
      <div class="kpf-archive__intro kpf-content-block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">What’s New At KPF?</p>
            <h2 id="kpf-home-blog-title" class="kpf-content-block__title kpf-content-block__title--h2">Latest on our blog</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Updates from grants, events, and the people doing the work — newest first.</p>
          </div>
        </div>
      </div>
      <a class="kpf-archive__card kpf-archive__card--media" href="/blog/">
        <div class="kpf-archive__media">{$blog}</div>
        <div class="kpf-archive__meta">
          <p class="kpf-archive__category">Events</p>
          <p class="kpf-archive__date">July 18, 2026 · 6 min read</p>
          <h3 class="kpf-content-block__title kpf-content-block__title--h3">What Songwriters for Vets taught us about showing up</h3>
          <span class="kpf-link">Read the story</span>
        </div>
      </a>
    </div>
  </section>

  <section id="donate" class="kpf-donate kpf-section kpf-donate--band" aria-labelledby="kpf-home-donate-title">
    <div class="kpf-u-container kpf-donate__inner">
      <div class="kpf-donate__copy">
        <div class="kpf-content-block kpf-u-invert">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group">
              <p class="kpf-content-block__eyebrow">Together, we can.</p>
              <h2 id="kpf-home-donate-title" class="kpf-content-block__title kpf-content-block__title--h2">KPF grants are awarded to <span class="kpf-donate__emphasis">vetted</span> organizations helping veterans.</h2>
            </div>
            <div class="kpf-content-block__body-group">
              <p class="kpf-content-block__body">Every dollar goes out as a grant to a Florida organization we’ve vetted ourselves.</p>
            </div>
          </div>
          <div class="kpf-content-block__actions">
            {$donate_btn}
            <button type="button" class="kpf-btn kpf-btn--secondary" data-kpf-href="/about/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Learn about our work</button>
          </div>
        </div>
        <p class="kpf-donate__note">A 501(c)(3) nonprofit organization</p>
      </div>
      <div class="kpf-donate__impact">
        <h3 class="kpf-h4">How your donations are used</h3>
        <div class="kpf-donate__list">
          <details class="kpf-accordion">
            <summary class="kpf-accordion__header"><h5 class="kpf-accordion__title">Housing</h5><span class="kpf-accordion__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></summary>
            <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Transitional and permanent housing for veterans who don’t currently have any.</p></div></div>
          </details>
          <details class="kpf-accordion">
            <summary class="kpf-accordion__header"><h5 class="kpf-accordion__title">Work</h5><span class="kpf-accordion__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></summary>
            <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Job training and workforce programs that turn service experience into a career.</p></div></div>
          </details>
          <details class="kpf-accordion">
            <summary class="kpf-accordion__header"><h5 class="kpf-accordion__title">Family</h5><span class="kpf-accordion__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></summary>
            <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Emergency financial help and support for veterans’ families, including Special Operations families in crisis.</p></div></div>
          </details>
        </div>
      </div>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * 404 / not found Site design. Hero + closing CTA, same file shape as homepage/about.
	 *
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function notfound( array $media ): string {
		$planes = self::img( $media, 'notfound.planes', '', '' );
		if ( '' === $planes ) {
			$planes_url = \KPF\Core\Support\FrontendUrl::base() . 'media/404/fighter-planes.webp';
			$planes     = sprintf(
				'<img src="%s" alt="" width="1600" height="1070" decoding="async" />',
				esc_url( $planes_url )
			);
		}
		$flag       = self::cta_flag( $media );
		$donate_btn = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' );
		$go         = '(function(el){var h=el.getAttribute(\'data-kpf-href\');if(!h)return;if(el.getAttribute(\'data-kpf-external\')==\'true\'&&!/^mailto:|^tel:/i.test(h)){window.open(h,\'_blank\',\'noopener,noreferrer\');return;}location.assign(h);})(this)';

		return <<<HTML
<div class="kpf-page-404" data-kpf-scaffold="notfound">
  <section class="kpf-hero kpf-hero--404" aria-labelledby="kpf-404-hero-title">
    <div class="kpf-hero--404__planes" aria-hidden="true">{$planes}</div>
    <div class="kpf-u-container kpf-hero__layout">
      <div class="kpf-hero__content">
        <div class="kpf-content-block kpf-u-invert">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group">
              <h1 id="kpf-404-hero-title" class="kpf-content-block__title kpf-content-block__title--h0">That page isn’t available right now.</h1>
            </div>
            <div class="kpf-content-block__body-group">
              <p class="kpf-content-block__body">We’re having trouble finding what you’re looking for, but we’re happy to help you get there. Here are a few helpful pages:</p>
            </div>
          </div>
          <div class="kpf-content-block__actions kpf-hero__actions">
            <button type="button" class="kpf-btn kpf-btn--primary" data-kpf-href="/about/" onclick="{$go}">About KPF</button>
            <button type="button" class="kpf-btn kpf-btn--secondary" data-kpf-href="/events/" onclick="{$go}">Our events</button>
            <button type="button" class="kpf-btn kpf-btn--outline" data-kpf-href="/about/#history" onclick="{$go}">Kevin’s story</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="kpf-cta-closing kpf-section" aria-labelledby="kpf-404-cta-title">
    {$flag}
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-u-invert kpf-cta-closing__block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <h2 id="kpf-404-cta-title" class="kpf-content-block__title kpf-content-block__title--h2">There's more than one way to make a difference.</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Volunteer a Saturday. Point us toward an org that deserves a look. Or give. Every gift becomes a grant in Kevin's name.</p>
          </div>
        </div>
        <div class="kpf-content-block__actions">
          {$donate_btn}
          <button type="button" class="kpf-btn kpf-btn--outline" data-kpf-href="/contact/" onclick="{$go}">Get in touch</button>
        </div>
      </div>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function about( array $media ): string {
		$bg       = self::img( $media, 'about.heroBeach', 'Volunteers and veterans gathered on the beach around a beach wheelchair', 'kpf-hero__media' );
		/* Pinned for restore: about.heroFrame + about.tampaBay cutout layout */
		$front    = self::img( $media, 'about.historyFront', 'Donald “Kevin” Popke', '' );
		$l1       = self::img( $media, 'about.history1', 'Donald “Kevin” Popke with his wife', '' );
		$l2       = self::img( $media, 'about.history2', 'Donald “Kevin” Popke running', '' );
		$back     = self::img( $media, 'about.historyBack', '', '' );
		$featured = self::img( $media, 'about.galleryFeatured', 'Volunteer helping a veteran in a beach wheelchair near the shore', '' );
		$g1       = self::img( $media, 'about.gallery1', 'Kevin Popke in flight gear', '' );
		$g2       = self::img( $media, 'about.gallery2', 'Kevin Popke running', '' );
		$g3       = self::img( $media, 'about.gallery3', 'Kevin Popke with family', '' );
		$g4       = self::img( $media, 'about.gallery4', 'Foundation volunteers at a cookout', '' );
		$hero_media = '' !== $bg ? '<div class="kpf-hero__media-wrap">' . $bg . '</div>' : '';
		$flag     = self::cta_flag( $media );

		$donate_btn = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' );

		return <<<HTML
<div class="kpf-page-about" data-kpf-scaffold="about">
  <section class="kpf-hero kpf-hero--about" aria-labelledby="kpf-about-hero-title">
    {$hero_media}
    <div class="kpf-u-container kpf-hero__layout">
      <!-- Pinned: framed photo — restore with tampa-bay cutout later -->
      <div class="kpf-hero__content">
        <div class="kpf-content-block">
            <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">About</p>
            <h1 id="kpf-about-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">About the Kevin Popke Foundation</h1>
          </div>
              <div class="kpf-content-block__body-group">
          <p class="kpf-content-block__body">We don't run the programs. We find the people already doing the hardest work for Florida's veterans — and we make sure their next year is funded.</p>
              </div>
            </div>
          <div class="kpf-content-block__actions kpf-hero__actions">
            <button type="button" class="kpf-btn kpf-btn--primary" data-kpf-href="#mission" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Our mission</button>
            <button type="button" class="kpf-btn kpf-btn--secondary" data-kpf-href="#history" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Who Kevin was</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="history" class="kpf-history kpf-section kpf-section--page" aria-labelledby="kpf-about-history-title">
    <div class="kpf-u-container">
      <div class="kpf-history__intro kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Our history</p>
          <h2 id="kpf-about-history-title" class="kpf-content-block__title kpf-content-block__title--h2">Who Kevin was</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body kpf-content-block__body--lede">The Foundation carries a name — and a stack of moments that made it necessary.</p>
            </div>
          </div>
      </div>
      <div class="kpf-history__split">
        <div class="kpf-history__stack">
          <div class="kpf-history__layer kpf-history__layer--front">{$front}</div>
          <div class="kpf-history__layer kpf-history__layer--1">{$l1}</div>
          <div class="kpf-history__layer kpf-history__layer--2">{$l2}</div>
          <div class="kpf-history__layer kpf-history__layer--back">{$back}</div>
        </div>
        <div class="kpf-history__aside">
          <div class="kpf-history__card">
            <div class="kpf-content-block">
                <div class="kpf-content-block__copy">
              <div class="kpf-content-block__title-group">
                <p class="kpf-content-block__eyebrow">Kevin's Story</p>
                <h3 class="kpf-content-block__title kpf-content-block__title--h3">Show up for other people.</h3>
              </div>
                  <div class="kpf-content-block__body-group">
              <p class="kpf-content-block__body">Kevin served his entire adult life. He retired as a U.S. Army First Sergeant after more than twenty years, remembered by the soldiers who served under him as a leader and a mentor.</p>
              <p class="kpf-content-block__body">A distracted driver killed him in 2016.</p>
              <p class="kpf-content-block__body">The Foundation was established to continue what he did with his time: show up for other people, particularly the ones who had served.</p>
                  </div>
                </div>
            </div>
          </div>
          <div class="kpf-history__dots" role="tablist" aria-label="History slides">
            <button type="button" class="kpf-history__dot is-active" aria-current="true" aria-label="Show history image 1 of 4"></button>
            <button type="button" class="kpf-history__dot" aria-label="Show history image 2 of 4"></button>
            <button type="button" class="kpf-history__dot" aria-label="Show history image 3 of 4"></button>
            <button type="button" class="kpf-history__dot" aria-label="Show history image 4 of 4"></button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="mission" class="kpf-mission kpf-section kpf-section--surface" aria-labelledby="kpf-about-mission-title">
    <div class="kpf-u-container kpf-mission__inner">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Our mission</p>
          <h2 id="kpf-about-mission-title" class="kpf-content-block__title kpf-content-block__title--h2">In tribute to Kevin Popke, we fund the work already underway</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">The Foundation makes targeted grants to veteran-focused charities across Tampa Bay and the rest of Florida. We don't build programs from scratch — we look for the ones that already deliver, and we help them keep going.</p>
        <p class="kpf-content-block__body">Before a dollar moves, we do the homework. And when we can, we put boots on the ground to watch the inspiring work happening firsthand.</p>
            </div>
          </div>
      </div>
      <div class="kpf-mission__criteria kpf-donate__list">
        <div class="kpf-accordion is-open">
          <button type="button" class="kpf-accordion__header" aria-expanded="true">
            <h5 class="kpf-accordion__title">Leadership in the work</h5>
          </button>
          <div class="kpf-accordion__body">
            <div class="kpf-accordion__content">
              <p>Founders and directors who are personally in it — hands on the wheelchair, not just the org chart.</p>
            </div>
          </div>
        </div>
        <div class="kpf-accordion">
          <button type="button" class="kpf-accordion__header" aria-expanded="false">
            <h5 class="kpf-accordion__title">Dollars that reach veterans</h5>
          </button>
          <div class="kpf-accordion__body" aria-hidden="true">
            <div class="kpf-accordion__content">
              <p>Money that lands with the people it's for, not administration and overhead.</p>
            </div>
          </div>
        </div>
        <div class="kpf-accordion">
          <button type="button" class="kpf-accordion__header" aria-expanded="false">
            <h5 class="kpf-accordion__title">Built to last</h5>
          </button>
          <div class="kpf-accordion__body" aria-hidden="true">
            <div class="kpf-accordion__content">
              <p>Organizations that will still be standing — and still serving — five years from now.</p>
            </div>
          </div>
        </div>
        <div class="kpf-accordion">
          <button type="button" class="kpf-accordion__header" aria-expanded="false">
            <h5 class="kpf-accordion__title">Close enough to see</h5>
          </button>
          <div class="kpf-accordion__body" aria-hidden="true">
            <div class="kpf-accordion__content">
              <p>Local enough that we can show up in person and confirm the work is real.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="grantees" class="kpf-grantees kpf-section kpf-section--page" aria-labelledby="kpf-about-grantees-title">
    <div class="kpf-u-container">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Making an impact</p>
          <h2 id="kpf-about-grantees-title" class="kpf-content-block__title kpf-content-block__title--h2">More than {{grants.total}} in grants — and counting</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">Our grants have met veterans in very different moments: without housing, living with serious injuries, or a Special Operations family hit by sudden crisis. Same standard behind every one — proven work, real reach, people we've often watched firsthand.</p>
            </div>
          </div>
      </div>
    </div>
  </section>

  <section class="kpf-gallery kpf-section" aria-labelledby="kpf-about-gallery-title">
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-u-invert kpf-gallery__intro">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">The work</p>
            <h2 id="kpf-about-gallery-title" class="kpf-content-block__title kpf-content-block__title--h2">KPF volunteers enable our ongoing support for our nation’s protectors</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Photos from grantee programs, events, and the communities we fund — the work on the ground, not stock.</p>
          </div>
        </div>
      </div>
      <div class="kpf-gallery__mosaic">
        <figure class="kpf-gallery__item">{$featured}</figure>
        <figure class="kpf-gallery__item">{$g1}</figure>
        <figure class="kpf-gallery__item">{$g2}</figure>
        <figure class="kpf-gallery__item">{$g3}</figure>
        <figure class="kpf-gallery__item">{$g4}</figure>
      </div>
    </div>
  </section>

  <section class="kpf-cta-closing kpf-section" aria-labelledby="kpf-about-cta-title">
    {$flag}
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-u-invert kpf-cta-closing__block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <h2 id="kpf-about-cta-title" class="kpf-content-block__title kpf-content-block__title--h2">There's more than one way to make a difference.</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.</p>
            </div>
          </div>
        <div class="kpf-content-block__actions">
          {$donate_btn}
          <button type="button" class="kpf-btn kpf-btn--outline" data-kpf-href="/contact/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Get in touch</button>
        </div>
      </div>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function events( array $media ): string {
		$hero      = self::img( $media, 'events.hero', 'Performer smiling on stage with a microphone and guitar', 'kpf-hero__media' );
		$hero_host = '' !== $hero
			? '<div class="kpf-hero__media-frame"><picture class="kpf-hero__media-host">' . $hero . '</picture></div>'
			: '';
		$tile1     = self::img( $media, 'events.featured1', '', '' );
		$tile2     = self::img( $media, 'events.featured2', '', '' );
		$tile3     = self::img( $media, 'events.featured3', '', '' );
		$tile4     = self::img( $media, 'events.featured4', '', '' );
		$host_img  = self::img( $media, 'events.cardMark', '', 'kpf-event-card__host' );
		$hosts_one = '' !== $host_img
			? '<div class="kpf-event-card__hosts" aria-hidden="true">' . $host_img . '</div>'
			: '';
		$hosts_two = '';
		if ( '' !== $host_img ) {
			$first  = preg_replace( '/class="kpf-event-card__host"/', 'class="kpf-event-card__host" style="z-index:1"', $host_img, 1 );
			$second = preg_replace( '/class="kpf-event-card__host"/', 'class="kpf-event-card__host" style="z-index:2"', $host_img, 1 );
			$hosts_two = '<div class="kpf-event-card__hosts" role="group" aria-label="Event hosts">' . $first . $second . '</div>';
		}
		$flag      = self::cta_flag( $media );

		$donate_btn = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' );
		$ticket_icon = '<span class="kpf-btn__icon kpf-btn__icon--trailing" aria-hidden="true">' . ChromeHtml::ticket_svg( 20 ) . '</span>';

		return <<<HTML
<div class="kpf-page-events" data-kpf-scaffold="events">
  <section class="kpf-hero kpf-hero--events" aria-labelledby="kpf-events-hero-title">
    {$hero_host}
    <div class="kpf-hero__scrim" aria-hidden="true"></div>
    <div class="kpf-u-container kpf-hero__layout">
      <div class="kpf-hero__content">
        <div class="kpf-content-block kpf-u-invert">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group">
              <p class="kpf-content-block__eyebrow">Kevin Popke Foundation events</p>
              <h1 id="kpf-events-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">Songwriters for Vets</h1>
            </div>
            <div class="kpf-content-block__body-group">
              <p class="kpf-content-block__body">Our events raise money to support our mission, and we have a good time while doing it.</p>
            </div>
          </div>
          <div class="kpf-content-block__actions kpf-hero__actions">
            <button type="button" class="kpf-btn kpf-btn--primary" data-kpf-href="#featured" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Featured event</button>
            <button type="button" class="kpf-btn kpf-btn--outline" data-kpf-href="#partner" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Partner with us</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="partner" class="kpf-events-partner kpf-section kpf-section--page" aria-labelledby="kpf-events-context-title">
    <div class="kpf-u-container kpf-events-partner__inner">
      <div class="kpf-content-block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Partner with us</p>
            <h2 id="kpf-events-context-title" class="kpf-content-block__title kpf-content-block__title--h2">Sponsor, partner, or host something with us</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Our events happen because businesses and individuals decide to put their name behind them. Sponsorship puts your business in front of a room that cares who's in it, and it funds grants directly.</p>
            <p class="kpf-content-block__body">There's also room for other ideas. If you want to run a fundraiser, host a collection, or partner on an event of your own, we'd like to hear it.</p>
          </div>
        </div>
        <div class="kpf-content-block__actions">
          {$donate_btn}
        </div>
      </div>
      <div class="kpf-events-partner__paths kpf-donate__list">
        <div class="kpf-accordion is-open">
          <button type="button" class="kpf-accordion__header" aria-expanded="true"><h5 class="kpf-accordion__title">Sponsor a night</h5></button>
          <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Put your name behind a room that cares who's in it. Packages start where you are and fund grants directly.</p></div></div>
        </div>
        <div class="kpf-accordion">
          <button type="button" class="kpf-accordion__header" aria-expanded="false"><h5 class="kpf-accordion__title">Host a fundraiser</h5></button>
          <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Run a collection, a dinner, or a night of your own. We'll help you point every dollar toward Florida veterans.</p></div></div>
        </div>
        <div class="kpf-accordion">
          <button type="button" class="kpf-accordion__header" aria-expanded="false"><h5 class="kpf-accordion__title">Corporate match</h5></button>
          <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Double the impact of employee giving with a corporate match tied to an event or a year-round partnership.</p></div></div>
        </div>
      </div>
    </div>
  </section>

  <section id="featured" class="kpf-featured-event kpf-section" aria-labelledby="kpf-events-featured-title">
    <div class="kpf-u-container kpf-featured-event__inner">
      <div class="kpf-featured-event__collage">
        <div class="kpf-featured-event__collage-row kpf-featured-event__collage-row--top">
          <figure class="kpf-featured-event__tile kpf-featured-event__tile--1">{$tile1}</figure>
          <figure class="kpf-featured-event__tile kpf-featured-event__tile--2">{$tile2}</figure>
        </div>
        <div class="kpf-featured-event__collage-row kpf-featured-event__collage-row--bottom">
          <figure class="kpf-featured-event__tile kpf-featured-event__tile--3">{$tile3}</figure>
          <figure class="kpf-featured-event__tile kpf-featured-event__tile--4">{$tile4}</figure>
        </div>
      </div>
      <div class="kpf-content-block kpf-u-invert kpf-featured-event__copy">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Featured</p>
            <h2 id="kpf-events-featured-title" class="kpf-content-block__title kpf-content-block__title--h2">Songwriters for Vets</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Once a year, Nashville songwriters take a stage in Florida and play the songs they wrote, many you already know by heart, and share the fascinating stories behind each tune. There's an auction, an open bar, and a community proudly supporting our protectors.</p>
            <p class="kpf-content-block__body">Buying a ticket is one of the most direct ways to support Florida veterans.</p>
          </div>
        </div>
        <div class="kpf-content-block__actions">
          <button type="button" class="kpf-btn kpf-btn--primary" data-kpf-href="https://songwriters4vets.com" data-kpf-external="true" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Get tickets{$ticket_icon}</button>
          <button type="button" class="kpf-btn kpf-btn--outline" data-kpf-href="/contact/?inquiry=partnership" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Become a sponsor</button>
        </div>
      </div>
    </div>
  </section>

  <section class="kpf-event-library kpf-section" aria-labelledby="kpf-events-library-title">
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-event-library__intro">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">On the calendar</p>
            <h2 id="kpf-events-library-title" class="kpf-content-block__title kpf-content-block__title--h2">Upcoming events</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Benefit nights and partner fundraisers that put money straight into grants for Florida veterans. Will we see you there?</p>
          </div>
        </div>
      </div>
      <div class="kpf-event-library__grid">
        <article class="kpf-event-card"><div class="kpf-event-card__body"><div class="kpf-event-card__copy">{$hosts_two}<h3 class="kpf-event-card__title">Songwriters for Vets - Naples</h3><p class="kpf-event-card__body-text">Nashville songwriters perform their #1 hits and tell the stories behind them. Auction, open bar, proceeds supporting Florida veterans.</p></div></div></article>
        <article class="kpf-event-card"><div class="kpf-event-card__body"><div class="kpf-event-card__copy">{$hosts_one}<h3 class="kpf-event-card__title">Community Golf Classic</h3><p class="kpf-event-card__body-text">A partner-hosted scramble raising funds for veteran housing and emergency assistance grants across Southwest Florida.</p></div></div></article>
        <article class="kpf-event-card"><div class="kpf-event-card__body"><div class="kpf-event-card__copy">{$hosts_one}<h3 class="kpf-event-card__title">Holiday Giving Night</h3><p class="kpf-event-card__body-text">An end-of-year gathering with music, auction items, and a direct path to fund the next round of KPF grants.</p></div></div></article>
      </div>
    </div>
  </section>

  <section class="kpf-cta-closing kpf-section" aria-labelledby="kpf-events-cta-title">
    {$flag}
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-u-invert kpf-cta-closing__block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <h2 id="kpf-events-cta-title" class="kpf-content-block__title kpf-content-block__title--h2">There's more than one way to make a difference.</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.</p>
          </div>
        </div>
        <div class="kpf-content-block__actions">
          {$donate_btn}
          <button type="button" class="kpf-btn kpf-btn--outline" data-kpf-href="/contact/" onclick="(function(el){var h=el.getAttribute('data-kpf-href');if(!h)return;if(el.getAttribute('data-kpf-external')==='true'&&!/^mailto:|^tel:/i.test(h)){window.open(h,'_blank','noopener,noreferrer');return;}location.assign(h);})(this)">Get in touch</button>
        </div>
      </div>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function contact( array $media ): string {
		unset( $media );

		$donate_sm = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary kpf-btn--sm' );

		return <<<HTML
<div class="kpf-page-contact" data-kpf-scaffold="contact">
  <section class="kpf-hero kpf-hero--contact" aria-labelledby="kpf-contact-hero-title">
    <div class="kpf-hero__scrim" aria-hidden="true"></div>
    <div class="kpf-hero__content">
      <div class="kpf-content-block kpf-content-block--inverse">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Contact</p>
          <h1 id="kpf-contact-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">Get in touch</h1>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">A nonprofit is only as strong as the community holding it up. Whatever you have in mind, start here.</p>
            </div>
          </div>
      </div>
    </div>
  </section>

  <section class="kpf-section kpf-section--page" aria-labelledby="kpf-contact-ways-title">
    <div class="kpf-u-container">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Community</p>
          <h2 id="kpf-contact-ways-title" class="kpf-content-block__title kpf-content-block__title--h2">Ways to help</h2>
        </div>
          </div>
      </div>
      <div class="kpf-values__grid">
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group"><h3 class="kpf-content-block__title kpf-content-block__title--h3">Volunteer</h3>
            </div>
            <div class="kpf-content-block__body-group"><p class="kpf-content-block__body">Events need hands, and so does the work between them. Tell us what you’re good at.</p>
            </div>
          </div></div>
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group"><h3 class="kpf-content-block__title kpf-content-block__title--h3">Sponsor an event</h3>
            </div>
            <div class="kpf-content-block__body-group"><p class="kpf-content-block__body">Put your business behind a night that funds grants for Florida veterans.</p>
            </div>
          </div></div>
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group"><h3 class="kpf-content-block__title kpf-content-block__title--h3">Partner with us</h3>
            </div>
            <div class="kpf-content-block__body-group"><p class="kpf-content-block__body">Corporate matching, a fundraiser of your own, or an idea we haven’t thought of yet.</p>
            </div>
          </div></div>
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group"><h3 class="kpf-content-block__title kpf-content-block__title--h3">Spread the word</h3>
            </div>
            <div class="kpf-content-block__body-group"><p class="kpf-content-block__body">Share what we do with people who’d want to know. It costs nothing and it works.</p>
            </div>
          </div></div>
      </div>
    </div>
  </section>

  <section class="kpf-contact kpf-section kpf-section--surface" aria-labelledby="kpf-contact-form-title">
    <div class="kpf-u-container kpf-u-split">
      <div>
        <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Message</p>
            <h2 id="kpf-contact-form-title" class="kpf-content-block__title kpf-content-block__title--h2">Send us a message</h2>
          </div>
            <div class="kpf-content-block__body-group">
          <p class="kpf-content-block__body">We’ll get back within a few days.</p>
            </div>
          </div>
        </div>
        {{form:contact}}
      </div>
      <aside class="kpf-content-block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Direct</p>
            <h2 class="kpf-content-block__title kpf-content-block__title--h3">Or reach us directly</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <address class="kpf-content-block__body">
              <strong>The Kevin Popke Foundation, Inc.</strong><br />
              A 501(c)(3) nonprofit organization
            </address>
            <p class="kpf-content-block__body">Prefer to just give? {$donate_sm}</p>
          </div>
        </div>
      </aside>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * Posts archive (Templates → Posts archive). Faust injects {{#each queries.blog-posts}}.
	 *
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function blog_archive( array $media ): string {
		$flag       = self::cta_flag( $media );
		$donate_btn = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' );

		return <<<HTML
<div class="kpf-page kpf-page--blog" data-kpf-scaffold="blog-archive">
  <section class="kpf-hero kpf-hero--blog kpf-section kpf-section--inverse kpf-u-invert" aria-labelledby="kpf-blog-hero-title">
    <div class="kpf-u-container">
      <div class="kpf-hero__layout">
        <div class="kpf-content-block kpf-hero__content">
          <div class="kpf-content-block__copy">
            <div class="kpf-content-block__title-group">
              <p class="kpf-content-block__eyebrow">Updates, News &amp; More</p>
              <h1 id="kpf-blog-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">Welcome to the KPF blog</h1>
            </div>
            <div class="kpf-content-block__body-group">
              <p class="kpf-content-block__body">We have the privilege of supporting veterans because of the dedication and passion of our volunteers. Be sure to check out our stories, updates, and other news.</p>
            </div>
          </div>
          <div class="kpf-content-block__actions kpf-hero__actions">
            <a class="kpf-btn kpf-btn--primary" href="#archive">Latest stories</a>
            <a class="kpf-btn kpf-btn--outline" href="#topics">Browse topics</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="archive" class="kpf-blog-archive kpf-section" aria-labelledby="kpf-blog-archive-title">
    <div class="kpf-u-container">
      <header class="kpf-blog-archive__header kpf-content-block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <p class="kpf-content-block__eyebrow">Our Blog Archive</p>
            <h2 id="kpf-blog-archive-title" class="kpf-content-block__title kpf-content-block__title--h2">All stories</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Updates from grants, events, and the people doing the work — newest first.</p>
          </div>
        </div>
      </header>

      {{#if queries.blog-posts}}
      {{#each queries.blog-posts}}
      {{#if @first}}
      <a class="kpf-blog-featured kpf-blog-row kpf-blog-row--featured" href="{{href}}" data-kpf-category="{{categorySlug}}">
        <div class="kpf-blog-row__copy">
          <div class="kpf-blog-row__meta">
            {{#if category}}<span class="kpf-blog-row__meta-item"><span class="kpf-blog-row__chip">{{category}}</span></span>{{/if}}
            {{#if date}}<span class="kpf-blog-row__meta-item"><span class="kpf-blog-row__date">{{date}}</span></span>{{/if}}
            {{#if readTime}}<span class="kpf-blog-row__meta-item"><span class="kpf-blog-row__read">{{readTime}}</span></span>{{/if}}
          </div>
          <h3 class="kpf-content-block__title kpf-content-block__title--h2">{{title}}</h3>
          {{#if description}}<p class="kpf-blog-row__excerpt">{{description}}</p>{{/if}}
          <span class="kpf-link kpf-blog-row__cta">Read the story</span>
        </div>
        <div class="kpf-blog-row__media">
          {{#if featuredImage.url}}<img class="kpf-blog-row__thumb" src="{{featuredImage.url}}" alt="{{featuredImage.alt}}" loading="eager" decoding="async" />{{else}}<div class="kpf-blog-row__thumb kpf-blog-row__thumb--empty" aria-hidden="true"></div>{{/if}}
        </div>
      </a>
      {{/if}}
      {{/each}}

      {{blog-filters}}

      <div class="kpf-blog-grid">
      {{#each queries.blog-posts}}
      {{#if @first}}{{else}}
      <a class="kpf-blog-row" href="{{href}}" data-kpf-category="{{categorySlug}}">
        <div class="kpf-blog-row__copy">
          <div class="kpf-blog-row__meta">
            {{#if category}}<span class="kpf-blog-row__meta-item"><span class="kpf-blog-row__chip">{{category}}</span></span>{{/if}}
            {{#if date}}<span class="kpf-blog-row__meta-item"><span class="kpf-blog-row__date">{{date}}</span></span>{{/if}}
          </div>
          <h3 class="kpf-content-block__title kpf-content-block__title--h3">{{title}}</h3>
          {{#if description}}<p class="kpf-blog-row__excerpt">{{description}}</p>{{/if}}
          <span class="kpf-link kpf-blog-row__cta">Read story</span>
        </div>
        {{#if featuredImage.url}}<img class="kpf-blog-row__thumb" src="{{featuredImage.url}}" alt="{{featuredImage.alt}}" loading="lazy" decoding="async" />{{else}}<div class="kpf-blog-row__thumb kpf-blog-row__thumb--empty" aria-hidden="true"></div>{{/if}}
      </a>
      {{/if}}
      {{/each}}
      </div>
      <p class="kpf-blog-archive__empty" data-kpf-filter-empty hidden="hidden">No stories in this topic.</p>
      {{else}}
      <p class="kpf-blog-archive__empty">No stories published yet. Check back soon.</p>
      {{/if}}
    </div>
  </section>

  <section class="kpf-cta-closing kpf-section" aria-labelledby="kpf-blog-cta-title">
    {$flag}
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-u-invert kpf-cta-closing__block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <h2 id="kpf-blog-cta-title" class="kpf-content-block__title kpf-content-block__title--h2">There's more than one way to make a difference.</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.</p>
          </div>
        </div>
        <div class="kpf-content-block__actions">
          {$donate_btn}
          <a class="kpf-btn kpf-btn--outline" href="/contact/">Get in touch</a>
        </div>
      </div>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * Single post (Templates → Posts singular). Faust fills {{page.*}} from the post.
	 *
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function blog_post( array $media ): string {
		$flag       = self::cta_flag( $media );
		$donate_btn = ChromeHtml::donate_button( 'Donate', 'kpf-btn kpf-btn--primary' );

		return <<<HTML
<div class="kpf-page kpf-page--post" data-kpf-scaffold="blog-post">
  <section class="kpf-hero kpf-hero--post kpf-section kpf-u-invert" aria-labelledby="kpf-post-title">
    <div class="kpf-u-container">
      <div class="kpf-hero__layout">
        <div class="kpf-content-block kpf-hero__content">
          <nav class="kpf-post-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true"> / </span>
            <a href="/blog/">Blog</a>
            {{#if fields.category}}<span aria-hidden="true"> / </span><span>{{fields.category}}</span>{{/if}}
          </nav>
          <h1 id="kpf-post-title" class="kpf-content-block__title kpf-content-block__title--h1">{{page.title}}</h1>
          <p class="kpf-post-meta">
            {{#if page.date}}<span>{{page.date}}</span>{{/if}}
            {{#if fields.readTime}}<span aria-hidden="true"> · </span><span>{{fields.readTime}}</span>{{/if}}
            {{#if page.author.name}}<span aria-hidden="true"> · </span><span>By {{page.author.name}}</span>{{/if}}
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="kpf-post-body kpf-section" aria-label="Article">
    <div class="kpf-u-container kpf-post-body__inner">
      {{post-sidebar}}
      <div class="kpf-post-main">
        {{#if page.featuredImage.url}}
        <figure class="kpf-post-featured">
          <img src="{{page.featuredImage.url}}" alt="{{page.featuredImage.alt}}" loading="eager" decoding="async" />
        </figure>
        {{/if}}
        <article class="kpf-article">{{{page.content}}}</article>
        <aside class="kpf-post-continue" aria-label="Keep reading">
          <p class="kpf-content-block__body">Read more about <a href="/about/#history">who Kevin Popke was</a> and <a href="/about/#grantees">the grants given in his name</a>.</p>
        </aside>
      </div>
    </div>
  </section>

  {{comments}}

  {{#if queries.related-posts}}
  <section class="kpf-related kpf-section" aria-labelledby="kpf-related-title">
    <div class="kpf-u-container">
      <header class="kpf-related__header kpf-content-block">
        <p class="kpf-content-block__eyebrow">Keep reading</p>
        <h2 id="kpf-related-title" class="kpf-content-block__title kpf-content-block__title--h2">Other stories from the foundation</h2>
      </header>
      <div class="kpf-related__grid">
        {{#each queries.related-posts}}
        <a class="kpf-blog-row kpf-related__card" href="{{href}}">
          <div class="kpf-blog-row__copy">
            <div class="kpf-blog-row__meta">
              {{#if category}}<span class="kpf-blog-row__chip">{{category}}</span>{{/if}}
              {{#if date}}<span class="kpf-blog-row__date">{{date}}</span>{{/if}}
            </div>
            <h3 class="kpf-content-block__title kpf-content-block__title--h3">{{title}}</h3>
            {{#if description}}<p class="kpf-blog-row__excerpt">{{description}}</p>{{/if}}
            <span class="kpf-link kpf-blog-row__cta">Read story</span>
          </div>
          {{#if featuredImage.url}}<img class="kpf-blog-row__thumb" src="{{featuredImage.url}}" alt="{{featuredImage.alt}}" loading="lazy" decoding="async" />{{/if}}
        </a>
        {{/each}}
      </div>
    </div>
  </section>
  {{/if}}

  <section class="kpf-cta-closing kpf-section" aria-labelledby="kpf-post-cta-title">
    {$flag}
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-u-invert kpf-cta-closing__block">
        <div class="kpf-content-block__copy">
          <div class="kpf-content-block__title-group">
            <h2 id="kpf-post-cta-title" class="kpf-content-block__title kpf-content-block__title--h2">There's more than one way to make a difference.</h2>
          </div>
          <div class="kpf-content-block__body-group">
            <p class="kpf-content-block__body">Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.</p>
          </div>
        </div>
        <div class="kpf-content-block__actions">
          {$donate_btn}
          <a class="kpf-btn kpf-btn--outline" href="/contact/">Get in touch</a>
        </div>
      </div>
    </div>
  </section>
</div>
HTML;
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 * @return array<string, array{sourceUrl: string, altText: string}>
	 */
	public static function media_map_from_items( array $items ): array {
		$out = array();
		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['key'] ) || empty( $item['sourceUrl'] ) ) {
				continue;
			}
			$out[ (string) $item['key'] ] = array(
				'sourceUrl' => (string) $item['sourceUrl'],
				'altText'   => (string) ( $item['altText'] ?? '' ),
			);
		}
		return $out;
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	private static function img( array $media, string $key, string $fallback_alt, string $class ): string {
		$url = (string) ( $media[ $key ]['sourceUrl'] ?? '' );
		if ( '' === $url ) {
			return '';
		}
		$alt = (string) ( $media[ $key ]['altText'] ?? '' );
		if ( '' === $alt ) {
			$alt = $fallback_alt;
		}
		$class_attr = '' !== $class ? ' class="' . esc_attr( $class ) . '"' : '';
		return sprintf(
			'<img%s src="%s" alt="%s" loading="lazy" decoding="async" />',
			$class_attr,
			esc_url( $url ),
			esc_attr( $alt )
		);
	}

	/**
	 * Full-bleed flag video + scrim for closing CTA bands.
	 *
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	private static function cta_flag( array $media ): string {
		$url = (string) ( $media['cta.flag']['sourceUrl'] ?? '' );
		if ( '' === $url ) {
			return '';
		}

		return sprintf(
			'<div class="kpf-cta-closing__media" aria-hidden="true"><video autoplay muted loop playsinline preload="metadata"><source src="%s" type="video/mp4"/></video></div><div class="kpf-cta-closing__scrim" aria-hidden="true"></div>',
			esc_url( $url )
		);
	}

	/**
	 * Home hero cutout wrapper — hosts depth-graded mask-image on the img.
	 *
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	private static function cutout( array $media, string $key, string $class ): string {
		$url = (string) ( $media[ $key ]['sourceUrl'] ?? '' );
		if ( '' === $url ) {
			return '';
		}

		$safe_url = esc_url( $url );
		return sprintf(
			'<div class="%s"><img src="%s" alt="" decoding="async" /></div>',
			esc_attr( $class ),
			$safe_url
		);
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	private static function partner_chips( array $media ): string {
		unset( $media );
		$html  = '';
		$items = \KPF\Core\Grantees\GraphQL::partner_list( 24 );
		foreach ( $items as $item ) {
			$name = (string) ( $item['name'] ?? '' );
			$logo = (string) ( $item['logoUrl'] ?? '' );
			if ( '' === $name || '' === $logo ) {
				continue;
			}
			$inner = sprintf(
				'<img class="kpf-partners__logo" src="%s" alt="" width="28" height="28" loading="lazy" decoding="async" /><span class="kpf-partners__name">%s</span>',
				esc_url( $logo ),
				esc_html( $name )
			);
			$html .= sprintf(
				'<a class="kpf-partners__chip" href="%s">%s</a>',
				esc_url( '/about/#grantees' ),
				$inner
			);
		}
		return $html;
	}

	/**
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	private static function partner_logos( array $media ): string {
		return self::partner_chips( $media );
	}
}
