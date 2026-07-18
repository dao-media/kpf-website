import { useEffect } from "react";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(
  CustomEase,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  ScrollTrigger,
);

export const KPF_GSAP_QUERY = `
  kpfGsapAnimations {
    databaseId
    name
    selector
    trigger
    method
    configJson
  }
`;

function parseAnimation(animation) {
  try {
    return {
      ...animation,
      config: JSON.parse(animation.configJson || "{}"),
    };
  } catch {
    return null;
  }
}

function createTween(targets, animation, extra = {}) {
  const { config } = animation;
  const ease =
    config.ease === "custom"
      ? CustomEase.create(
          `kpf-ease-${animation.databaseId}`,
          config.customBezier || "0.25,0.1,0.25,1",
        )
      : config.ease;
  const common = {
    duration: config.duration,
    delay: config.delay,
    ease,
    stagger: config.stagger || 0,
    repeat: config.repeat || 0,
    yoyo: Boolean(config.yoyo),
    overwrite: "auto",
    ...extra,
  };
  const svg = config.svg || {};

  if (svg.effect === "draw") {
    return gsap.fromTo(
      targets,
      { drawSVG: svg.drawFrom || "0% 0%" },
      {
        drawSVG: svg.drawTo || "0% 100%",
        transformOrigin: svg.transformOrigin || "50% 50%",
        ...common,
      },
    );
  }
  if (svg.effect === "morph" && svg.morphTarget) {
    return gsap.to(targets, {
      morphSVG: { shape: svg.morphTarget, type: "rotational" },
      transformOrigin: svg.transformOrigin || "50% 50%",
      ...common,
    });
  }
  if (svg.effect === "motionPath" && svg.pathSelector) {
    return gsap.to(targets, {
      motionPath: {
        path: svg.pathSelector,
        align: svg.pathSelector,
        alignOrigin: [0.5, 0.5],
        autoRotate: Boolean(svg.autoRotate),
      },
      ...common,
    });
  }

  if (config.method === "to") {
    return gsap.to(targets, { ...(config.to || {}), ...common });
  }
  if (config.method === "fromTo") {
    return gsap.fromTo(targets, config.from || {}, {
      ...(config.to || {}),
      ...common,
    });
  }
  if (config.method === "keyframes") {
    return gsap.to(targets, {
      keyframes: (config.keyframes || []).map((frame) => ({
        ...(frame.props || {}),
        duration: frame.duration,
        ease: frame.ease,
      })),
      repeat: common.repeat,
      yoyo: common.yoyo,
      stagger: common.stagger,
      overwrite: "auto",
      ...extra,
    });
  }
  return gsap.from(targets, { ...(config.from || {}), ...common });
}

export default function GsapRuntime({ animations = [] }) {
  const router = useRouter();

  useEffect(() => {
    if (!animations.length) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const listeners = [];
    const context = gsap.context(() => {
      animations
        .map(parseAnimation)
        .filter(Boolean)
        .forEach((animation) => {
          let targets;
          try {
            targets = gsap.utils.toArray(animation.selector);
          } catch {
            return;
          }
          if (!targets.length) return;

          if (animation.trigger === "in-view") {
            targets.forEach((target) => {
              const scroll = animation.config.scroll || {};
              createTween(target, animation, {
                scrollTrigger: {
                  trigger: target,
                  start: scroll.start || "top 85%",
                  end: scroll.end || "bottom 20%",
                  scrub: Number(scroll.scrub) || false,
                  once: Boolean(scroll.once),
                  toggleActions: Number(scroll.scrub)
                    ? undefined
                    : "play none none reverse",
                  id: `kpf-animation-${animation.databaseId}`,
                },
              });
            });
            return;
          }

          if (animation.trigger === "hover" || animation.trigger === "click") {
            targets.forEach((target) => {
              const tween = createTween(target, animation, {
                paused: true,
                immediateRender: false,
              });
              if (animation.trigger === "hover") {
                const enter = () => tween.restart();
                const leave = () => tween.reverse();
                target.addEventListener("mouseenter", enter);
                target.addEventListener("mouseleave", leave);
                listeners.push([target, "mouseenter", enter], [target, "mouseleave", leave]);
              } else {
                const click = () => tween.restart();
                target.addEventListener("click", click);
                listeners.push([target, "click", click]);
              }
            });
            return;
          }

          createTween(targets, animation);
        });
    }, document.body);

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      listeners.forEach(([target, event, handler]) =>
        target.removeEventListener(event, handler),
      );
      context.revert();
    };
  }, [animations, router.asPath]);

  return null;
}

export { createTween, parseAnimation };
