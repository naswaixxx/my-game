import { useEffect } from "react";
import { useAnimationFrame } from "../hooks/useAnimationFrame.ts";
import { useLatest } from "../hooks/useLatest.ts";
import { usePool } from "../partner/WordsContext.tsx";
import { useGameSelector, useGameStore } from "../store/GameContext.tsx";
import { hasProgressChanged, saveGame } from "../storage.ts";
import type { GameStore } from "../store/GameContext.tsx";

function useSaveGame(store: GameStore): void {
  useEffect(() => {
    let saved = store.getState();
    const unsubscribe = store.subscribe(() => {
      const next = store.getState();
      if (hasProgressChanged(saved, next)) saveGame(next);
      saved = next;
    });
    const flush = (): void => saveGame(store.getState());
    const flushWhenHidden = (): void => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      unsubscribe();
    };
  }, [store]);
}

export function useGameEngine(): void {
  const store = useGameStore();
  const pool = useLatest(usePool());
  const playing = useGameSelector((state) => state.status === "playing");

  useSaveGame(store);
  useAnimationFrame(
    (dt) => store.dispatch({ type: "tick", dt, pool: pool.current }),
    playing
  );
}
