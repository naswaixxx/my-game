import { useMemo } from "react";
import { usePool } from "../partner/WordsContext.tsx";
import { createSeed } from "../random.ts";
import { useGameStore } from "../store/GameContext.tsx";
import { useLatest } from "../hooks/useLatest.ts";

export interface GameActions {
  readonly changeDraft: (value: string) => void;
  readonly submit: () => void;
  readonly restart: () => void;
}

export function useGameActions(): GameActions {
  const { dispatch } = useGameStore();
  const pool = useLatest(usePool());

  return useMemo(
    () => ({
      changeDraft: (value) => dispatch({ type: "input", value }),
      submit: () => dispatch({ type: "submit" }),
      restart: () =>
        dispatch({ type: "restart", seed: createSeed(), pool: pool.current }),
    }),
    [dispatch, pool]
  );
}
