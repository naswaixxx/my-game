import { nextRandom } from "./random.ts";
import type { GameAction, GameState } from "./types.ts";

export const FIELD_WIDTH = 600;
export const MAX_WORDS = 8;
export const MAX_MISSES = 5;
export const MAX_DRAFT_LENGTH = 20;
export const WORDS_PER_LEVEL = 5;
export const MIN_WORD_LENGTH = 3;

const START_WORDS = 2;
const BASE_SPEED = 160;
const SPEED_STEP = 25;
const MISS_SPEED_STEP = 10;
const MAX_SPEED = 520;
const COUNT_LIMIT = 1_000_000_000;
const WORD_PATTERN = /^[а-яё]+(?:-[а-яё]+)*$/;

const isCount = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= COUNT_LIMIT;

export const isPlayableWord = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length >= MIN_WORD_LENGTH &&
  value.length <= MAX_DRAFT_LENGTH &&
  WORD_PATTERN.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeWord(text: string): string {
  return text.normalize("NFC").trim().toLowerCase();
}

export function getLevel(state: Pick<GameState, "typed">): number {
  return 1 + Math.floor(state.typed / WORDS_PER_LEVEL);
}

export function getSpeed(state: Pick<GameState, "typed" | "misses">): number {
  const speed =
    BASE_SPEED +
    (getLevel(state) - 1) * SPEED_STEP +
    state.misses * MISS_SPEED_STEP;
  return Math.min(speed, MAX_SPEED);
}

function spawnWord(state: GameState, pool: readonly string[]): GameState {
  const free = pool.filter((word) => !state.items.includes(word));
  if (free.length === 0) return state;
  const [value, seed] = nextRandom(state.seed);
  const word = free[Math.floor(value * free.length)];
  if (word === undefined) return state;
  return { ...state, seed, items: [...state.items, word] };
}

export function createGame(
  best: number,
  pool: readonly string[],
  seed: number
): GameState {
  let state: GameState = {
    status: "playing",
    score: 0,
    best,
    typed: 0,
    misses: 0,
    items: [],
    draft: "",
    position: 0,
    direction: 1,
    seed,
  };
  for (let i = 0; i < START_WORDS; i++) {
    state = spawnWord(state, pool);
  }
  return state;
}

export function submitWord(state: GameState, typedText: string): GameState {
  const word = normalizeWord(typedText);
  if (state.status !== "playing" || !word) return state;
  if (!state.items.includes(word)) {
    const misses = state.misses + 1;
    const status = misses >= MAX_MISSES ? "over" : state.status;
    return { ...state, misses, status };
  }

  const score = state.score + word.length * getLevel(state);
  return {
    ...state,
    score,
    best: Math.max(state.best, score),
    typed: state.typed + 1,
    items: state.items.filter((item) => item !== word),
  };
}

export function advance(
  state: GameState,
  dt: number,
  length: number,
  pool: readonly string[]
): GameState {
  if (state.status !== "playing") return state;

  const start = Math.min(state.position, length);
  const before = state.direction === 1 ? start : 2 * length - start;
  const after = before + getSpeed(state) * Math.max(dt, 0);
  const phase = after % (2 * length);
  const forward = phase < length;
  const bounces = Math.floor(after / length) - Math.floor(before / length);

  let next: GameState = {
    ...state,
    position: forward ? phase : 2 * length - phase,
    direction: forward ? 1 : -1,
  };
  const spawns = next.items.length === 0 ? Math.max(bounces, 1) : bounces;
  for (let i = 0; i < spawns && next.items.length <= MAX_WORDS; i++) {
    next = spawnWord(next, pool);
  }
  return next.items.length > MAX_WORDS ? { ...next, status: "over" } : next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "tick":
      return advance(state, action.dt, FIELD_WIDTH, action.pool);
    case "input":
      if (state.status !== "playing") return state;
      return { ...state, draft: action.value.slice(0, MAX_DRAFT_LENGTH) };
    case "submit": {
      const next = submitWord(state, state.draft);
      return next === state ? state : { ...next, draft: "" };
    }
    case "restart":
      return createGame(state.best, action.pool, action.seed);
  }
}

function toGameState(data: unknown, seed: number): GameState | null {
  if (!isRecord(data)) return null;
  const { status, score, best, typed, misses, items, draft } = data;
  const { position, direction } = data;

  if (status !== "playing" && status !== "over") return null;
  if (!isCount(score) || !isCount(best)) return null;
  if (!isCount(typed) || !isCount(misses)) return null;
  if (typeof position !== "number" || !Number.isFinite(position)) return null;
  if (position < 0 || position > FIELD_WIDTH) return null;
  if (direction !== 1 && direction !== -1) return null;
  if (typeof draft !== "string" || draft.length > MAX_DRAFT_LENGTH) return null;
  if (!Array.isArray(items) || items.length > MAX_WORDS + 1) return null;
  if (!items.every(isPlayableWord)) return null;
  if (new Set(items).size !== items.length) return null;

  if (best < score || misses > MAX_MISSES) return null;
  if (score < typed * MIN_WORD_LENGTH) return null;
  if (score > typed * MAX_DRAFT_LENGTH * getLevel({ typed })) return null;
  const lost = items.length > MAX_WORDS || misses >= MAX_MISSES;
  if (lost !== (status === "over")) return null;

  return {
    status,
    score,
    best,
    typed,
    misses,
    items,
    draft,
    position,
    direction,
    seed,
  };
}

export function parseSave(json: unknown, seed: number): GameState | null {
  if (typeof json !== "string") return null;
  try {
    return toGameState(JSON.parse(json), seed);
  } catch {
    return null;
  }
}
