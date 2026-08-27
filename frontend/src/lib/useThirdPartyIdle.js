import { useEffect, useState } from "react";
const { INTERACTION_EVENTS } = require("./thirdPartyIdle");

const MAX_WAIT_MS = 4000;
const IDLE_CAP_MS = 2000;

/**
 * True after load+idle, first input, or 4s — whichever is first.
 */
export default function useThirdPartyIdle() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId = 0;
    let idleFallbackTimer = 0;
    let maxWaitTimer = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup();
      setReady(true);
    };

    const onIdle = () => {
      if (typeof requestIdleCallback === "function") {
        idleId = requestIdleCallback(finish, { timeout: IDLE_CAP_MS });
        return;
      }
      idleFallbackTimer = window.setTimeout(finish, 1);
    };

    const onLoad = () => onIdle();

    if (document.readyState === "complete") {
      onIdle();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    INTERACTION_EVENTS.forEach((type) => {
      window.addEventListener(type, finish, { once: true, passive: true });
    });
    maxWaitTimer = window.setTimeout(finish, MAX_WAIT_MS);

    function cleanup() {
      window.clearTimeout(idleFallbackTimer);
      window.clearTimeout(maxWaitTimer);
      if (idleId && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId);
      }
      window.removeEventListener("load", onLoad);
      INTERACTION_EVENTS.forEach((type) => {
        window.removeEventListener(type, finish);
      });
    }

    return cleanup;
  }, []);

  return ready;
}
