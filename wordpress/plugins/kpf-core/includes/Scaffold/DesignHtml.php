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
		$cutout_dad    = self::img( $media, 'home.kevinDad', '', 'kpf-hero__cutout kpf-hero__cutout--dad' );
		$cutout_alumni = self::img( $media, 'home.kevinAlumni', '', 'kpf-hero__cutout kpf-hero__cutout--alumni' );
		$cutout_runner = self::img( $media, 'home.kevinRunner', '', 'kpf-hero__cutout kpf-hero__cutout--runner' );
		$kevin    = self::img( $media, 'home.kevinDoubleExposure', 'Double-exposure portrait of Kevin Popke with a parachutist silhouette', '' );
		if ( $kevin === '' ) {
			$kevin = self::img( $media, 'home.kevin', 'Donald “Kevin” Popke in uniform', '' );
		}
		$dunes    = self::img( $media, 'home.dunes', '', 'kpf-programs__dunes' );
		$card1    = self::img( $media, 'home.hero', '', '' );
		$card2    = self::img( $media, 'events.featured', '', '' );
		$card3    = self::img( $media, 'events.library1', '', '' );
		$card4    = self::img( $media, 'home.programs', '', '' );
		$collage1 = self::img( $media, 'home.programsCollageBeach', '', '' );
		$collage2 = self::img( $media, 'home.programsCollageBbq', '', '' );
		$blog     = self::img( $media, 'events.library1', '', 'kpf-archive__thumb' );

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
            <p class="kpf-content-block__eyebrow">Together, we can.</p>
            <h1 id="kpf-home-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">We fund organizations showing up for vets.</h1>
          </div>
            <div class="kpf-content-block__body-group">
          <p class="kpf-content-block__body">The Kevin Popke Foundation makes targeted grants to veteran-focused nonprofits in Tampa Bay and across Florida — the small organizations doing the hardest work, closest to the ground.</p>
            </div>
          </div>
          <div class="kpf-content-block__actions kpf-hero__actions">
            <a class="kpf-btn kpf-btn--primary" href="/#donate">Donate</a>
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
            <a class="kpf-btn kpf-btn--primary" href="/#donate">Donate \$50 for ‘50’</a>
            <a class="kpf-btn kpf-btn--secondary" href="/about/">Kevin’s story</a>
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
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card1}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">What You Can Do</p><h3 class="kpf-card__title">Donate to Kevin’s Cause</h3><p class="kpf-card__description">Every dollar goes out as a grant to a Florida organization we’ve vetted ourselves.</p><div class="kpf-card__actions"><a class="kpf-btn kpf-btn--primary kpf-btn--sm" href="/#donate">Donate</a></div></div></article>
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card2}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">What You Can Do</p><h3 class="kpf-card__title">Check out our events</h3><p class="kpf-card__description">Buy a ticket, bring people, have a good night out for a serious reason.</p><div class="kpf-card__actions"><a class="kpf-btn kpf-btn--primary kpf-btn--sm" href="/events/">See events</a></div></div></article>
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card3}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">Who We Work With</p><h3 class="kpf-card__title">Songwriters for Vets</h3><p class="kpf-card__description">Each year Nashville songwriters come to play the songs you know by heart.</p><div class="kpf-card__actions"><a class="kpf-btn kpf-btn--primary kpf-btn--sm" href="/events/">See events</a></div></div></article>
        <article class="kpf-card kpf-values__card"><div class="kpf-card__media">{$card4}</div><div class="kpf-card__body"><p class="kpf-card__eyebrow">What You Can Do</p><h3 class="kpf-card__title">Get involved at KPF</h3><p class="kpf-card__description">Volunteer, sponsor an event, or bring the Foundation to your company or community.</p><div class="kpf-card__actions"><a class="kpf-btn kpf-btn--primary kpf-btn--sm" href="/contact/">Contact us</a></div></div></article>
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
          <li class="kpf-programs__item"><span class="kpf-programs__check" aria-hidden="true">✓</span><div><h3 class="kpf-programs__item-title">Housing</h3><p class="kpf-programs__item-body">Transitional and permanent housing for veterans who don’t currently have any.</p></div></li>
          <li class="kpf-programs__item"><span class="kpf-programs__check" aria-hidden="true">✓</span><div><h3 class="kpf-programs__item-title">Work</h3><p class="kpf-programs__item-body">Job training and workforce programs that turn service experience into a career.</p></div></li>
          <li class="kpf-programs__item"><span class="kpf-programs__check" aria-hidden="true">✓</span><div><h3 class="kpf-programs__item-title">Health</h3><p class="kpf-programs__item-body">Mental health care and adaptive programs for veterans living with injury.</p></div></li>
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
      <a class="kpf-archive__card" href="/blog/">
        {$blog}
        <div class="kpf-archive__meta">
          <p class="kpf-archive__category">Events</p>
          <p class="kpf-archive__date">July 18, 2026 · 6 min read</p>
          <h3 class="kpf-archive__title">What Songwriters for Vets taught us about showing up</h3>
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
            <a class="kpf-btn kpf-btn--primary" href="/#donate">Donate via PayPal</a>
            <a class="kpf-btn kpf-btn--secondary" href="/about/">Learn about our work</a>
          </div>
        </div>
        <p class="kpf-donate__note">A 501(c)(3) nonprofit organization</p>
      </div>
      <div class="kpf-donate__impact">
        <h3 class="kpf-h4">How your donations are used</h3>
        <div class="kpf-donate__list">
          <details class="kpf-accordion">
            <summary class="kpf-accordion__header"><span class="kpf-accordion__title">Housing</span><span class="kpf-accordion__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></summary>
            <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Transitional and permanent housing for veterans who don’t currently have any.</p></div></div>
          </details>
          <details class="kpf-accordion">
            <summary class="kpf-accordion__header"><span class="kpf-accordion__title">Work</span><span class="kpf-accordion__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></summary>
            <div class="kpf-accordion__body"><div class="kpf-accordion__content"><p>Job training and workforce programs that turn service experience into a career.</p></div></div>
          </details>
          <details class="kpf-accordion">
            <summary class="kpf-accordion__header"><span class="kpf-accordion__title">Family</span><span class="kpf-accordion__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></summary>
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
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	public static function about( array $media ): string {
		$bg    = self::img( $media, 'about.tampaBay', '', 'kpf-hero__media' );
		$frame = self::img( $media, 'about.heroFrame', 'Kevin Popke cutout portrait', '' );
		$front = self::img( $media, 'about.historyFront', 'Donald “Kevin” Popke', '' );
		$l1    = self::img( $media, 'about.history1', 'Donald “Kevin” Popke with his wife', '' );
		$l2    = self::img( $media, 'about.history2', 'Donald “Kevin” Popke running', '' );
		$back  = self::img( $media, 'about.historyBack', '', '' );

		return <<<HTML
<div class="kpf-page-about" data-kpf-scaffold="about">
  <section class="kpf-hero kpf-hero--about" aria-labelledby="kpf-about-hero-title">
    {$bg}
    <div class="kpf-hero__frame">{$frame}</div>
    <div class="kpf-hero__content">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">About</p>
          <h1 id="kpf-about-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">About the Kevin Popke Foundation</h1>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">A Florida foundation that funds the organizations doing the hardest work for veterans — built to continue the way one man spent his life.</p>
            </div>
          </div>
        <div class="kpf-content-block__actions kpf-hero__actions">
          <a class="kpf-btn kpf-btn--primary" href="#mission">Our mission</a>
          <a class="kpf-btn kpf-btn--secondary" href="/contact/">Get in touch</a>
        </div>
      </div>
    </div>
  </section>

  <section class="kpf-history kpf-section kpf-section--page" aria-labelledby="kpf-about-history-title">
    <div class="kpf-history__stack">
      <div class="kpf-history__layer kpf-history__layer--front">{$front}</div>
      <div class="kpf-history__layer kpf-history__layer--1">{$l1}</div>
      <div class="kpf-history__layer kpf-history__layer--2">{$l2}</div>
      <div class="kpf-history__layer kpf-history__layer--back">{$back}</div>
    </div>
    <div class="kpf-history__card">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Who Kevin was</p>
          <h2 id="kpf-about-history-title" class="kpf-content-block__title kpf-content-block__title--h2">The Foundation carries his name</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">The Foundation carries the name of Donald “Kevin” Popke — “50” to his friends.</p>
        <p class="kpf-content-block__body">Kevin served his entire adult life. He retired as a U.S. Army First Sergeant after more than twenty years, remembered by the soldiers who served under him as a leader and a mentor. He kept going afterward as a Department of Defense contractor, doing national security work with the same seriousness he brought to everything.</p>
        <p class="kpf-content-block__body">A distracted driver killed him in 2016.</p>
        <p class="kpf-content-block__body">The Foundation was established to continue what he did with his time: show up for other people, particularly the ones who had served. That’s the whole idea. Everything else — the grants, the vetting, the event, the volunteers — is machinery built around it.</p>
            </div>
          </div>
      </div>
    </div>
  </section>

  <section id="mission" class="kpf-mission kpf-section kpf-section--surface" aria-labelledby="kpf-about-mission-title">
    <div class="kpf-u-container kpf-u-container--narrow">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Our mission</p>
          <h2 id="kpf-about-mission-title" class="kpf-content-block__title kpf-content-block__title--h2">Our mission</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">The Kevin Popke Foundation supports veteran-focused charities in the Tampa Bay area and other Florida communities through targeted grants.</p>
        <p class="kpf-content-block__body">We don’t run programs ourselves. We look for organizations already doing the work — housing, job training, mental health care, family support, and the everyday business of keeping veterans connected to each other — and we give them money to keep doing it.</p>
        <p class="kpf-content-block__body">The grants are targeted on purpose. A small organization with committed leadership and low overhead can do more with a well-timed grant than a large one can do with the same money. Our job is to find those organizations and fund them.</p>
            </div>
          </div>
      </div>
    </div>
  </section>

  <section class="kpf-cta-closing kpf-section" aria-labelledby="kpf-about-cta-title">
    <div class="kpf-u-container">
      <div class="kpf-content-block kpf-content-block--inverse">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Together, we can.</p>
          <h2 id="kpf-about-cta-title" class="kpf-content-block__title kpf-content-block__title--h2">There’s more than one way to be part of this.</h2>
        </div>
          </div>
        <div class="kpf-content-block__actions">
          <a class="kpf-btn kpf-btn--primary" href="/#donate">Donate</a>
          <a class="kpf-btn kpf-btn--secondary" href="/events/">See upcoming events</a>
          <a class="kpf-btn kpf-btn--secondary" href="/contact/">Get in touch</a>
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
		$hero     = self::img( $media, 'events.hero', '', 'kpf-hero__media' );
		$featured = self::img( $media, 'events.featured', '', '' );
		$library  = self::img( $media, 'events.library1', '', '' );

		return <<<HTML
<div class="kpf-page-events" data-kpf-scaffold="events">
  <section class="kpf-hero kpf-hero--events" aria-labelledby="kpf-events-hero-title">
    {$hero}
    <div class="kpf-hero__scrim" aria-hidden="true"></div>
    <div class="kpf-hero__content">
      <div class="kpf-content-block kpf-content-block--inverse">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">What funds our mission</p>
          <h1 id="kpf-events-hero-title" class="kpf-content-block__title kpf-content-block__title--h1">Events</h1>
        </div>
            <div class="kpf-content-block__body-group">
        <p class="kpf-content-block__body">Our events raise the money we grant. They’re also a good time.</p>
            </div>
          </div>
        <div class="kpf-content-block__actions kpf-hero__actions">
          <a class="kpf-btn kpf-btn--primary" href="#featured">Songwriters for Vets</a>
          <a class="kpf-btn kpf-btn--secondary" href="/contact/?inquiry=partnership">Partner with us</a>
        </div>
      </div>
    </div>
  </section>

  <section id="featured" class="kpf-featured-event kpf-section kpf-section--surface" aria-labelledby="kpf-events-featured-title">
    {$featured}
    <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
      <div class="kpf-content-block__title-group">
        <p class="kpf-content-block__eyebrow">Our largest source of support</p>
        <h2 id="kpf-events-featured-title" class="kpf-content-block__title kpf-content-block__title--h2">Songwriters for Vets</h2>
      </div>
            <div class="kpf-content-block__body-group">
      <p class="kpf-content-block__body">Once a year, Nashville songwriters take a stage in Florida and play the songs they wrote — the ones you already know by heart — and tell you how each one came to exist. There’s an auction, an open bar, and a room full of people who came for the same reason.</p>
      <p class="kpf-content-block__body">Songwriters for Vets is the single largest source of the grant money this Foundation puts to work each year. Buying a ticket is one of the most direct ways to support Florida veterans.</p>
            </div>
          </div>
      <div class="kpf-content-block__actions">
        <a class="kpf-btn kpf-btn--primary" href="https://songwriters4vets.com" target="_blank" rel="noopener noreferrer">Get tickets</a>
        <a class="kpf-btn kpf-btn--secondary" href="/contact/?inquiry=partnership">Become a sponsor</a>
      </div>
    </div>
  </section>

  <section class="kpf-event-library kpf-section" aria-labelledby="kpf-events-library-title">
    <div class="kpf-u-container">
      <div class="kpf-content-block">
          <div class="kpf-content-block__copy">
        <div class="kpf-content-block__title-group">
          <p class="kpf-content-block__eyebrow">Upcoming</p>
          <h2 id="kpf-events-library-title" class="kpf-content-block__title kpf-content-block__title--h2">Upcoming events</h2>
        </div>
            <div class="kpf-content-block__body-group">
        <h3 class="kpf-content-block__title kpf-content-block__title--h3">Nothing on the calendar right now</h3>
        <p class="kpf-content-block__body">We announce events a few months out. The best way to hear first is to follow along — or reach out if you’d like to help put one together.</p>
            </div>
          </div>
        <div class="kpf-content-block__actions"><a class="kpf-btn kpf-btn--secondary" href="/contact/">Get in touch</a></div>
      </div>
      <div class="kpf-event-library__grid">{$library}</div>
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
            <p class="kpf-content-block__body">Prefer to just give? <a class="kpf-btn kpf-btn--primary kpf-btn--sm" href="/#donate">Donate</a></p>
          </div>
        </div>
      </aside>
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
	 * @param array<string, array{sourceUrl?: string, altText?: string}> $media
	 */
	private static function partner_chips( array $media ): string {
		unset( $media );
		$html  = '';
		$items = \KPF\Core\Grantees\GraphQL::partner_list( 24 );
		foreach ( $items as $item ) {
			$name = (string) ( $item['name'] ?? '' );
			$logo = (string) ( $item['logoUrl'] ?? '' );
			$url  = (string) ( $item['website'] ?? '' );
			if ( '' === $name || '' === $logo ) {
				continue;
			}
			$inner = sprintf(
				'<img class="kpf-partners__logo" src="%s" alt="" width="28" height="28" loading="lazy" decoding="async" /><span class="kpf-partners__name">%s</span>',
				esc_url( $logo ),
				esc_html( $name )
			);
			if ( '' !== $url ) {
				$html .= sprintf(
					'<a class="kpf-partners__chip" href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a>',
					esc_url( $url ),
					esc_attr( sprintf( '%s (opens in a new tab)', $name ) ),
					$inner
				);
			} else {
				$html .= '<div class="kpf-partners__chip">' . $inner . '</div>';
			}
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
