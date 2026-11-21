import { WORDS } from "./words.js";

export const MAX_WORDS = 8;
export const MAX_MISSES = 5;

const START_WORDS = 2;
const WORDS_PER_LEVEL = 5;
const BASE_SPEED = 160;
const SPEED_STEP = 25;
const MISS_SPEED_STEP = 10;
const MAX_SPEED = 520;
const MAX_FRAME_TIME = 0.1;
const COUNT_LIMIT = 1_000_000_000;
const POSITION_LIMIT = 100_000;

const isCount = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= COUNT_LIMIT;

export function getLevel(state) {
  return 1 + Math.floor(state.typed / WORDS_PER_LEVEL);
}

export function getSpeed(state) {
  const speed =
    BASE_SPEED +
    (getLevel(state) - 1) * SPEED_STEP +
    state.misses * MISS_SPEED_STEP;
  return Math.min(speed, MAX_SPEED);
}

function spawnWord(state, random) {
  const free = WORDS.filter((word) => !state.items.includes(word));
  const word = free[Math.floor(random() * free.length)];
  return { ...state, items: [...state.items, word] };
}

export function createGame(best = 0, random = Math.random) {
  let state = {
    status: "playing",
    score: 0,
    best,
    typed: 0,
    misses: 0,
    items: [],
    position: 0,
    direction: 1,
  };
  for (let i = 0; i < START_WORDS; i++) {
    state = spawnWord(state, random);
  }
  return state;
}

export function submitWord(state, typedText) {
  const word = typedText.trim().toLowerCase();
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

export function advance(state, dt, length, random = Math.random) {
  if (state.status !== "playing" || length <= 0) return state;

  const step = Math.min(Math.max(dt, 0), MAX_FRAME_TIME);
  const start = Math.min(state.position, length);
  const before = state.direction === 1 ? start : 2 * length - start;
  const after = before + getSpeed(state) * step;
  const phase = after % (2 * length);
  const forward = phase < length;
  const bounced = Math.floor(after / length) > Math.floor(before / length);

  let next = {
    ...state,
    position: forward ? phase : 2 * length - phase,
    direction: forward ? 1 : -1,
  };
  if (bounced || next.items.length === 0) {
    next = spawnWord(next, random);
  }
  if (next.items.length > MAX_WORDS) {
    next = { ...next, status: "over" };
  }
  return next;
}

const isValidBall = (data) =>
  typeof data === "object" &&
  data !== null &&
  Number.isFinite(data.position) &&
  data.position >= 0 &&
  data.position <= POSITION_LIMIT &&
  (data.direction === 1 || data.direction === -1);

function isValidSave(data) {
  if (!isValidBall(data)) return false;
  if (data.status !== "playing" && data.status !== "over") return false;
  if (![data.score, data.best, data.typed, data.misses].every(isCount)) {
    return false;
  }
  if (data.best < data.score || data.misses > MAX_MISSES) return false;
  if (!Array.isArray(data.items) || data.items.length > MAX_WORDS + 1) {
    return false;
  }
  if (!data.items.every((item) => WORDS.includes(item))) return false;
  if (new Set(data.items).size !== data.items.length) return false;
  const lost = data.items.length > MAX_WORDS || data.misses >= MAX_MISSES;
  return lost === (data.status === "over");
}

function parseWith(isValid, json) {
  try {
    const data = JSON.parse(json);
    return isValid(data) ? data : null;
  } catch {
    return null;
  }
}

export function parseSave(json) {
  return parseWith(isValidSave, json);
}

export function parseBall(json) {
  const data = parseWith(isValidBall, json);
  return data && { position: data.position, direction: data.direction };
}
