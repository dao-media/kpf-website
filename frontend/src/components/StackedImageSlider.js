import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const {
	DEFAULT_BACK_OPACITY,
	DEFAULT_EXIT_SCALE,
	DEFAULT_EXIT_X,
	DEFAULT_EXIT_Y,
	DEFAULT_SCALE_STEP,
	DEFAULT_STAGGER_X,
	DEFAULT_STAGGER_Y,
	DEFAULT_VISIBLE_COUNT,
	rotateQueue,
	stackLayout,
} = require("@/lib/stackedImageSlider");

gsap.registerPlugin(ScrollTrigger);

/**
 * Right-front fan stack: bottom-aligned, scaled, opacity trail to the left.
 * Scroll exits the front up/right; it recycles in at the left back of the queue.
 */
export default function StackedImageSlider({
	images = [],
	visibleCount = DEFAULT_VISIBLE_COUNT,
	scaleStep = DEFAULT_SCALE_STEP,
	exitScale = DEFAULT_EXIT_SCALE,
	staggerY = DEFAULT_STAGGER_Y,
	staggerX = DEFAULT_STAGGER_X,
	backOpacity = DEFAULT_BACK_OPACITY,
	exitX = DEFAULT_EXIT_X,
	exitY = DEFAULT_EXIT_Y,
	scrub = 0.45,
	stepScrollVh = 90,
	className = "",
	ariaLabel = "Photo stack",
}) {
	const rootRef = useRef(null);
	const cardRefs = useRef([]);

	const slides = useMemo(
		() =>
			(Array.isArray(images) ? images : [])
				.map((item, index) => ({
					id: item?.id || `slide-${index}`,
					src: item?.src || item?.url || "",
					alt: item?.alt || item?.caption || `Photo ${index + 1}`,
					caption: item?.caption || "",
				}))
				.filter((item) => item.src),
		[images],
	);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || slides.length < 1) {
			return undefined;
		}

		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		const baseQueue = slides.map((_, index) => index);
		const cards = cardRefs.current.filter(Boolean);

		const paint = (queue, stepProgress) => {
			const layout = stackLayout({
				queueLength: queue.length,
				stepProgress,
				visibleCount,
				scaleStep,
				exitScale,
				staggerY,
				staggerX,
				backOpacity,
				exitX,
				exitY,
			});

			layout.forEach((slot) => {
				const imageIndex = queue[slot.queueIndex];
				const card = cards[imageIndex];
				if (!card) return;
				gsap.set(card, {
					x: slot.x,
					y: slot.y,
					scale: slot.scale,
					opacity: slot.opacity,
					zIndex: slot.zIndex,
					visibility: slot.opacity > 0.001 ? "visible" : "hidden",
					force3D: true,
				});
			});
		};

		paint(baseQueue, 0);

		if (reduceMotion || slides.length < 2) {
			return undefined;
		}

		const steps = slides.length;
		let wrapping = false;

		const ctx = gsap.context(() => {
			ScrollTrigger.create({
				trigger: root,
				start: "top top",
				end: () => `+=${Math.max(1, steps) * stepScrollVh}%`,
				pin: true,
				scrub,
				anticipatePin: 1,
				invalidateOnRefresh: true,
				onUpdate(self) {
					if (wrapping) return;

					const raw = self.progress * steps;
					const capped = Math.min(Math.max(raw, 0), steps - 0.0001);
					const completed = Math.floor(capped);
					const stepProgress = capped - completed;
					const queue = rotateQueue(baseQueue, completed);
					paint(queue, stepProgress);

					if (self.progress > 0.999 && self.direction > 0) {
						wrapping = true;
						paint(rotateQueue(baseQueue, 0), 0);
						self.scroll(self.start + 1);
						requestAnimationFrame(() => {
							wrapping = false;
						});
					} else if (self.progress < 0.001 && self.direction < 0) {
						wrapping = true;
						paint(rotateQueue(baseQueue, steps - 1), 0.999);
						self.scroll(self.end - 1);
						requestAnimationFrame(() => {
							wrapping = false;
						});
					}
				},
			});
		}, root);

		return () => ctx.revert();
	}, [
		slides,
		visibleCount,
		scaleStep,
		exitScale,
		staggerY,
		staggerX,
		backOpacity,
		exitX,
		exitY,
		scrub,
		stepScrollVh,
	]);

	if (slides.length < 1) {
		return null;
	}

	return (
		<section
			ref={rootRef}
			className={`kpf-stacked-slider ${className}`.trim()}
			aria-roledescription="carousel"
			aria-label={ariaLabel}
		>
			<div className="kpf-stacked-slider__pin">
				{/*
				  Media card: unstyled on desktop (section owns the dark field).
				  On tablet/mobile the tartan + radial wash lives here instead.
				*/}
				<div className="kpf-stacked-slider__media">
					<div className="kpf-stacked-slider__stage">
						{slides.map((slide, index) => (
							<figure
								key={slide.id}
								ref={(node) => {
									cardRefs.current[index] = node;
								}}
								className="kpf-stacked-slider__card"
								data-stack-index={index}
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={slide.src} alt={slide.alt} draggable={false} />
								{slide.caption ? (
									<figcaption className="kpf-stacked-slider__caption">
										{slide.caption}
									</figcaption>
								) : null}
							</figure>
						))}
					</div>
				</div>
				<p className="kpf-stacked-slider__hint">
					Scroll to advance the stack
				</p>
			</div>
		</section>
	);
}
