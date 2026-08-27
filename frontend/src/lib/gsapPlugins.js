/**
 * Which GSAP Club plugins a CMS animation actually needs, and whether that
 * animation has targets on the current page.
 */

const EFFECT_PLUGINS = {
  draw: "DrawSVGPlugin",
  morph: "MorphSVGPlugin",
  motionPath: "MotionPathPlugin",
  splitText: "SplitText",
  scrambleText: "ScrambleTextPlugin",
  text: "TextPlugin",
  physics2D: "Physics2DPlugin",
  physicsProps: "PhysicsPropsPlugin",
};

const EASE_PLUGINS = {
  custom: ["CustomEase"],
  wiggle: ["CustomEase", "CustomWiggle"],
  customBounce: ["CustomEase", "CustomBounce"],
};

function parseAnimation(animation) {
  if (!animation || typeof animation !== "object") return null;
  if (animation.config && typeof animation.config === "object") {
    return animation;
  }
  try {
    return {
      ...animation,
      config: JSON.parse(animation.configJson || "{}"),
    };
  } catch {
    return null;
  }
}

function animationMatchesDocument(animation, root) {
  const selector = String(animation?.selector || "").trim();
  if (!selector || !root || typeof root.querySelectorAll !== "function") {
    return false;
  }
  try {
    return root.querySelectorAll(selector).length > 0;
  } catch {
    return false;
  }
}

/**
 * Skip display:none / visibility:hidden targets so GSAP CSSPlugin does not
 * unhide them to measure offsetParent (forced reflow). Opacity 0 stays
 * eligible — CMS/CSS parks still need the fade hardener.
 *
 * @param {Element | null | undefined} node
 * @returns {boolean}
 */
function isDisplayedForTween(node) {
  if (!node || node.nodeType !== 1) return false;
  if (typeof node.checkVisibility === "function") {
    try {
      return node.checkVisibility({
        checkOpacity: false,
        checkVisibilityCSS: true,
        contentVisibilityAuto: true,
      });
    } catch {
      return true;
    }
  }
  return true;
}

/**
 * CMS animations whose selectors exist on this page.
 * @param {unknown[]} animations
 * @param {{ querySelectorAll: (selector: string) => { length: number } }} [root]
 */
function animationsUsedOnPage(animations, root) {
  return (animations || []).map(parseAnimation).filter((animation) => {
    if (!animation) return false;
    return animationMatchesDocument(animation, root);
  });
}

/**
 * @param {Array<{ trigger?: string, config?: Record<string, unknown> }>} animations
 * @returns {string[]}
 */
function pluginsForAnimations(animations) {
  const names = new Set();
  for (const animation of animations || []) {
    if (!animation) continue;
    if (animation.trigger === "in-view") names.add("ScrollTrigger");
    const config =
      animation.config && typeof animation.config === "object"
        ? animation.config
        : {};
    const ease = String(config.ease || "");
    for (const plugin of EASE_PLUGINS[ease] || []) names.add(plugin);
    const svg = config.svg && typeof config.svg === "object" ? config.svg : {};
    const effect = String(svg.effect || "");
    if (EFFECT_PLUGINS[effect]) names.add(EFFECT_PLUGINS[effect]);
  }
  return [...names];
}

module.exports = {
  EFFECT_PLUGINS,
  EASE_PLUGINS,
  parseAnimation,
  animationMatchesDocument,
  animationsUsedOnPage,
  isDisplayedForTween,
  pluginsForAnimations,
};
