import { createGame, parseSave } from "./gameLogic.ts";
import type { GameState } from "./types.ts";

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

export function initGame(): GameState {
  return parseSave(readSave()) ?? createGame();
}
