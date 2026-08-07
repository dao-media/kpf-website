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

function createTween(targets, animation, extra = {}) {
  const { config } = animation;
  const ease = resolveEase(config, animation.databaseId);
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
  const effect = svg.effect || "none";

  if (effect === "draw") {
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
  if (effect === "morph" && svg.morphTarget) {
    return gsap.to(targets, {
      morphSVG: { shape: svg.morphTarget, type: "rotational" },
      transformOrigin: svg.transformOrigin || "50% 50%",
      ...common,
    });
  }
  if (effect === "motionPath" && svg.pathSelector) {
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
  if (effect === "splitText") {
    const nodes = gsap.utils.toArray(targets);
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
    return gsap.to(targets, {
      scrambleText: {
        text: svg.scrambleText || undefined,
        chars: svg.scrambleChars || "upperCase",
        speed: Number(svg.scrambleSpeed) || 0.3,
      },
      ...common,
    });
  }
  if (effect === "text") {
    return gsap.to(targets, {
      text: {
        value: svg.textValue || "",
        delimiter: svg.textDelimiter || "",
      },
      ...common,
    });
  }
  if (effect === "physics2D") {
    return gsap.to(targets, {
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
    return gsap.to(targets, {
      physicsProps: svg.physicsProps || {
        y: { acceleration: 500, friction: 0.1, velocity: -200 },
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

export { createTween, parseAnimation, resolveEase };
