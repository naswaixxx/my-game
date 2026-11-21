import { useEffect } from "react";
import { useLatest } from "./useLatest.ts";

export function useAnimationFrame(
  onFrame: (dt: number) => void,
  active: boolean
): void {
  const latest = useLatest(onFrame);

  useEffect(() => {
    if (!active) return undefined;

    let frame = 0;
    let previous: number | null = null;

    const loop = (time: number): void => {
      latest.current(previous === null ? 0 : (time - previous) / 1000);
      previous = time;
      frame = requestAnimationFrame(loop);
    };
    const restartClock = (): void => {
      previous = null;
    };

    document.addEventListener("visibilitychange", restartClock);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", restartClock);
    };
  }, [active, latest]);
}
