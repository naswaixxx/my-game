import { useCallback, useEffect, useReducer } from "react";
import { gameReducer } from "../gameLogic.ts";
import { initGame, saveGame } from "../storage.ts";
import type { GameState } from "../types.ts";
import { useAnimationFrame } from "./useAnimationFrame.ts";
import { useLatest } from "./useLatest.ts";

export interface GameApi {
  readonly state: GameState;
  readonly changeDraft: (value: string) => void;
  readonly submit: () => void;
  readonly restart: () => void;
}

export function useGame(): GameApi {
  const [state, dispatch] = useReducer(gameReducer, undefined, initGame);
  const latest = useLatest(state);
  const { items, status, score, best, typed, misses, draft } = state;

  useEffect(() => {
    saveGame(latest.current);
  }, [latest, items, status, score, best, typed, misses, draft]);

  useAnimationFrame(
    (dt) => dispatch({ type: "tick", dt, roll: Math.random() }),
    status === "playing"
  );

  const changeDraft = useCallback(
    (value: string) => dispatch({ type: "input", value }),
    []
  );
  const submit = useCallback(() => dispatch({ type: "submit" }), []);
  const restart = useCallback(
    () => dispatch({ type: "restart", roll: Math.random() }),
    []
  );

  return { state, changeDraft, submit, restart };
}
