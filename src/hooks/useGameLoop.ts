import { useEffect, useRef } from "react";
import { FIXED_STEP_MS } from "../engine/config";
import { useGameStore } from "../state/gameStore";

const MAX_FRAME_MS = 250; // clamp lag spikes and tab-refocus jumps
const MAX_STEPS_PER_FRAME = 5; // guard against the spiral of death

/**
 * Drive the engine from requestAnimationFrame using a fixed-timestep accumulator.
 * The engine only ever advances in FIXED_STEP_MS increments, so the round plays out
 * identically at 60Hz or 144Hz and stays reproducible for verification. The loop
 * runs only while a round is active; a backgrounded tab pauses (rAF stops) and
 * resumes without fabricating elapsed time, so the player never loses while away.
 */
export function useGameLoop(): void {
  const appPhase = useGameStore((s) => s.appPhase);
  const tick = useGameStore((s) => s.tick);
  const accRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (appPhase !== "active") {
      lastRef.current = null;
      accRef.current = 0;
      return;
    }

    let raf = 0;
    let cancelled = false;

    const onVisible = () => {
      // Drop the gap accumulated while hidden instead of fast-forwarding it.
      if (document.visibilityState === "visible") lastRef.current = null;
    };
    document.addEventListener("visibilitychange", onVisible);

    const frame = (now: number) => {
      if (cancelled) return;
      if (lastRef.current === null) lastRef.current = now;
      let dt = now - lastRef.current;
      lastRef.current = now;
      if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS;

      accRef.current += dt;
      let steps = 0;
      while (accRef.current >= FIXED_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        tick();
        accRef.current -= FIXED_STEP_MS;
        steps += 1;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [appPhase, tick]);
}
