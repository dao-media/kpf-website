/**
 * Which GSAP Club plugins a CMS animation actually needs.
 * GsapRuntime dynamic-imports only these — MorphSVG/Physics/Flip stay out
 * of the default Faust chunk.
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

/**
 * @param {Array<{ trigger?: string, config?: Record<string, unknown> }>} animations
 * @returns {string[]}
 */
function pluginsForAnimations(animations) {
  const names = new Set();
  for (const animation of animations || []) {
    if (!animation) continue;
    if (animation.trigger === "in-view") names.add("ScrollTrigger");
    const config = animation.config && typeof animation.config === "object" ? animation.config : {};
    const ease = String(config.ease || "");
    for (const plugin of EASE_PLUGINS[ease] || []) names.add(plugin);
    const svg = config.svg && typeof config.svg === "object" ? config.svg : {};
    const effect = String(svg.effect || "");
    if (EFFECT_PLUGINS[effect]) names.add(EFFECT_PLUGINS[effect]);
  }
  if (names.size > 0) names.add("ScrollTrigger");
  return [...names];
}

module.exports = {
  EFFECT_PLUGINS,
  EASE_PLUGINS,
  pluginsForAnimations,
};
