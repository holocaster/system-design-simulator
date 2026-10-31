import { useEffect } from "react";
import { runTick } from "../engine/tick";
import { currentDesign, useAppStore } from "../store/useAppStore";

const TICK_INTERVAL_MS = 100;

export function useSimulation() {
  const running = useAppStore((state) => state.running);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const state = useAppStore.getState();
      state.applyTick(
        runTick(
          currentDesign(),
          { rps: state.rps, writeRatio: state.writePercent / 100 },
          state.simState ?? undefined
        )
      );
    };

    tick();
    const intervalId = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [running]);
}
