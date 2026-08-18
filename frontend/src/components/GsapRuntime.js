import { useEffect } from "react";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import { CSSRulePlugin } from "gsap/CSSRulePlugin";
import { CustomBounce } from "gsap/CustomBounce";
import { CustomEase } from "gsap/CustomEase";
import { CustomWiggle } from "gsap/CustomWiggle";
import { Draggable } from "gsap/Draggable";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { EasePack, ExpoScaleEase, RoughEase, SlowMo } from "gsap/EasePack";
import { Flip } from "gsap/Flip";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Observer } from "gsap/Observer";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { PhysicsPropsPlugin } from "gsap/PhysicsPropsPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(
  CSSRulePlugin,
  CustomBounce,
  CustomEase,
  CustomWiggle,
  Draggable,
  DrawSVGPlugin,
  EasePack,
  ExpoScaleEase,
  Flip,
  InertiaPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Observer,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  RoughEase,
  ScrambleTextPlugin,
  ScrollSmoother,
  ScrollToPlugin,
  ScrollTrigger,
  SlowMo,
  SplitText,
  TextPlugin,
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

export const KPF_GSAP_PREMIUM_PLUGINS = [
  "CSSRulePlugin",
  "CustomBounce",
  "CustomEase",
  "CustomWiggle",
  "Draggable",
  "DrawSVGPlugin",
  "EasePack",
  "Flip",
  "InertiaPlugin",
  "MorphSVGPlugin",
  "MotionPathPlugin",
  "Observer",
  "Physics2DPlugin",
  "PhysicsPropsPlugin",
  "ScrambleTextPlugin",
  "ScrollSmoother",
  "ScrollToPlugin",
  "ScrollTrigger",
  "SplitText",
  "TextPlugin",
];

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

function resolveEase(config, animationId) {
  if (config.ease === "custom") {
    return CustomEase.create(
      `kpf-ease-${animationId}`,
      config.customBezier || "0.25,0.1,0.25,1",
    );
  }
  if (config.ease === "wiggle") {
    return CustomWiggle.create(`kpf-wiggle-${animationId}`, {
      wiggles: Number(config.wiggleCount) || 10,
      type: config.wiggleType || "easeOut",
    });
  }
  if (config.ease === "customBounce") {
    return CustomBounce.create(`kpf-bounce-${animationId}`, {
      strength: Number(config.bounceStrength) || 0.7,
      squash: Number(config.bounceSquash) || 1.5,
    });
  }
  return config.ease;
}

function resolveTweenTargets(triggerTargets, config) {
  const child = String(config?.animateChild || "").trim();
  if (!child) return triggerTargets;
  const nodes = gsap.utils.toArray(triggerTargets);
  return nodes.flatMap((node) => {
    if (!node || typeof node.querySelectorAll !== "function") return [];
    try {
      return gsap.utils.toArray(node.querySelectorAll(child));
    } catch {
      return [];
    }
  });
}

function createTween(targets, animation, extra = {}) {
  const { config } = animation;
  const tweenTargets = resolveTweenTargets(targets, config);
  if (!gsap.utils.toArray(tweenTargets).length) return null;
  const ease = resolveEase(config, animation.databaseId);
  const method = animation.method || config.method || "from";
  const origin =
    config.from?.transformOrigin ||
    config.to?.transformOrigin ||
    config.keyframes?.find((frame) => frame?.props?.transformOrigin)?.props
      ?.transformOrigin;
  if (origin) {
    // GSAP writes an inline `transform` when touch transformOrigin. A bare
    // translate(0,0) overrides CSS resting transforms (e.g. nav underline
    // scaleX:0) and leaves every link looking active. Seed `from` for paused
    // hover tweens so the resting state stays correct.
    // overwrite:false — a bare origin seed must not kill header badge entrance
    // (autoAlpha/y) and leave the anniversary mark stuck invisible.
    const setProps = { transformOrigin: origin, overwrite: false };
    if (extra.paused && config.from && typeof config.from === "object") {
      Object.assign(setProps, config.from);
    }
    gsap.set(tweenTargets, setProps);
  }
  const common = {
    duration: config.duration,
    delay: config.delay,
    ease,
    stagger: config.stagger || 0,
    repeat: config.repeat || 0,
    yoyo: Boolean(config.yoyo),
    // Paused hover tweens: don't clobber concurrent page entrances (badge drop).
    // Active/load tweens keep overwrite:auto so staggered entrances still compose.
    overwrite: extra.paused ? false : "auto",
    ...extra,
  };
  const svg = config.svg || {};
  const effect = svg.effect || "none";

  if (effect === "draw") {
    return gsap.fromTo(
      tweenTargets,
      { drawSVG: svg.drawFrom || "0% 0%" },
      {
        drawSVG: svg.drawTo || "0% 100%",
        transformOrigin: svg.transformOrigin || "50% 50%",
        ...common,
      },
    );
  }
  if (effect === "morph" && svg.morphTarget) {
    return gsap.to(tweenTargets, {
      morphSVG: { shape: svg.morphTarget, type: "rotational" },
      transformOrigin: svg.transformOrigin || "50% 50%",
      ...common,
    });
  }
  if (effect === "motionPath" && svg.pathSelector) {
    return gsap.to(tweenTargets, {
      motionPath: {
        path: svg.pathSelector,
        align: svg.pathSelector,
        alignOrigin: [0.5, 0.5],
        autoRotate: Boolean(svg.autoRotate),
      },
      ...common,
    });
  }
  if (effect === "splitText") {
    const nodes = gsap.utils.toArray(tweenTargets);
    const splits = nodes.map(
      (node) =>
        new SplitText(node, {
          type: svg.splitType || "chars,words,lines",
        }),
    );
    const animateKey = svg.splitAnimate || "chars";
    const parts = splits.flatMap((split) => split[animateKey] || split.chars || []);
    const tween = gsap.from(parts, {
      ...(config.from || { y: 24, autoAlpha: 0 }),
      ...common,
      stagger: Number(svg.splitStagger ?? config.stagger) || 0.03,
    });
    tween.eventCallback("onComplete", () => {
      // Keep split markup in place after entrance animations.
    });
    return tween;
  }
  if (effect === "scrambleText") {
    return gsap.to(tweenTargets, {
      scrambleText: {
        text: svg.scrambleText || undefined,
        chars: svg.scrambleChars || "upperCase",
        speed: Number(svg.scrambleSpeed) || 0.3,
      },
      ...common,
    });
  }
  if (effect === "text") {
    return gsap.to(tweenTargets, {
      text: {
        value: svg.textValue || "",
        delimiter: svg.textDelimiter || "",
      },
      ...common,
    });
  }
  if (effect === "physics2D") {
    return gsap.to(tweenTargets, {
      physics2D: {
        velocity: Number(svg.physicsVelocity) || 200,
        angle: Number(svg.physicsAngle) || -90,
        gravity: Number(svg.physicsGravity) || 500,
        friction: Number(svg.physicsFriction) || 0.1,
      },
      ...common,
    });
  }
  if (effect === "physicsProps") {
    return gsap.to(tweenTargets, {
      physicsProps: svg.physicsProps || {
        y: { acceleration: 500, friction: 0.1, velocity: -200 },
      },
      ...common,
    });
  }

  if (method === "to") {
    return gsap.to(tweenTargets, { ...(config.to || {}), ...common });
  }
  if (method === "fromTo") {
    return gsap.fromTo(tweenTargets, config.from || {}, {
      ...(config.to || {}),
      ...common,
    });
  }
  if (method === "keyframes") {
    return gsap.to(tweenTargets, {
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
  return gsap.from(tweenTargets, { ...(config.from || {}), ...common });
}


export default function GsapRuntime({ animations = [] }) {
  const router = useRouter();

  useEffect(() => {
    if (!animations.length) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const listeners = [];
    const cleanups = [];
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
            targets.forEach((target, index) => {
              const scroll = animation.config.scroll || {};
              const scrub = Number(scroll.scrub) || false;
              const once = scroll.once !== false;
              createTween(target, animation, {
                scrollTrigger: {
                  trigger: target,
                  start: scroll.start || "top 85%",
                  end: scroll.end || "bottom 20%",
                  scrub,
                  once,
                  toggleActions: scrub
                    ? undefined
                    : once
                      ? "play none none none"
                      : "play none none reverse",
                  id: `kpf-animation-${animation.databaseId}-${index}`,
                },
              });
            });
            return;
          }

          if (animation.trigger === "hover" || animation.trigger === "click") {
            targets.forEach((target) => {
              const tween = createTween(target, animation, {
                paused: true,
                // Apply `from` so resting state matches CSS (nav underlines
                // must start at scaleX:0; otherwise GSAP inline transforms
                // make every link look current).
                immediateRender: true,
              });
              if (!tween) return;
              if (animation.trigger === "hover") {
                const usesRotation = Boolean(
                  animation.config?.to?.rotation != null ||
                    animation.config?.from?.rotation != null ||
                    (animation.config?.keyframes || []).some(
                      (frame) => frame?.props?.rotation != null,
                    ),
                );
                /** Soft edge: delay leave so the hit-boundary doesn’t stutter. */
                const LEAVE_GRACE_MS = 160;
                let leaveTimer = null;
                /** True from first enter until a real leave — blocks click/focusin restarts. */
                let hovering = false;

                const clearLeaveTimer = () => {
                  if (leaveTimer) {
                    clearTimeout(leaveTimer);
                    leaveTimer = null;
                  }
                };

                const enter = (event) => {
                  // Still inside the trigger (moving between brand + badge).
                  if (
                    event?.type === "focusin" &&
                    event.relatedTarget &&
                    target.contains(event.relatedTarget)
                  ) {
                    return;
                  }
                  clearLeaveTimer();
                  // Already hovered (e.g. click → focusin while :hover) — do not re-run.
                  if (hovering) return;
                  hovering = true;
                  if (usesRotation) {
                    // Already mid-swing — don’t restart (avoids edge flicker).
                    if (tween.isActive()) return;
                    tween.restart();
                    return;
                  }
                  tween.restart();
                };

                const leave = (event) => {
                  if (
                    event?.relatedTarget &&
                    target.contains(event.relatedTarget)
                  ) {
                    return;
                  }
                  if (usesRotation) {
                    clearLeaveTimer();
                    leaveTimer = setTimeout(() => {
                      leaveTimer = null;
                      // Re-check: cursor may have returned during the grace window.
                      if (target.matches(":hover") || target.contains(document.activeElement)) {
                        return;
                      }
                      hovering = false;
                      tween.pause();
                      gsap.to(resolveTweenTargets(target, animation.config), {
                        rotation: 0,
                        duration: 0.4,
                        ease: "sine.out",
                        overwrite: "auto",
                      });
                    }, LEAVE_GRACE_MS);
                    return;
                  }
                  // Nav underline etc. — reverse only after a true unhover.
                  hovering = false;
                  tween.reverse();
                };

                target.addEventListener("mouseenter", enter);
                target.addEventListener("mouseleave", leave);
                target.addEventListener("focusin", enter);
                target.addEventListener("focusout", leave);
                listeners.push(
                  [target, "mouseenter", enter],
                  [target, "mouseleave", leave],
                  [target, "focusin", enter],
                  [target, "focusout", leave],
                );
                cleanups.push(clearLeaveTimer);
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
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, [animations, router.asPath]);

  return null;
}

export { createTween, parseAnimation, resolveEase, resolveTweenTargets };
