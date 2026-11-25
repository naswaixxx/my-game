import { createGame, parseSave } from "./gameLogic.ts";
import { createSeed } from "./random.ts";
import type { GameState } from "./types.ts";
import { WORDS } from "./words.ts";

const SAVE_KEY = "word_catcher_save_v2";

function readSave(): string | null {
  try {
    return window.localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

export function hasProgressChanged(a: GameState, b: GameState): boolean {
  return (
    a.items !== b.items ||
    a.status !== b.status ||
    a.score !== b.score ||
    a.best !== b.best ||
    a.typed !== b.typed ||
    a.misses !== b.misses ||
    a.draft !== b.draft
  );
}

export function initGame(): GameState {
  return (
    parseSave(readSave(), createSeed()) ?? createGame(0, WORDS, createSeed())
  );
}
