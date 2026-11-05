export const DEFAULT_SPEED = 100;
export const MAX_SPEED = 1000;
export const MAX_FRAME_TIME = 0.1;
export const MAX_TEXT_LENGTH = 60;
export const POINTS_PER_ITEM = 10;

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const isValidItem = (item) =>
  typeof item === "object" &&
  item !== null &&
  isFiniteNumber(item.id) &&
  typeof item.text === "string" &&
  item.text.length > 0;

export function createGameState(initial = {}) {
  const speed = isFiniteNumber(initial.speed) && initial.speed !== 0;
  return {
    score: isFiniteNumber(initial.score) ? initial.score : 0,
    items: Array.isArray(initial.items) ? initial.items : [],
    position: isFiniteNumber(initial.position) ? initial.position : 0,
    speed: speed
      ? Math.sign(initial.speed) * Math.min(Math.abs(initial.speed), MAX_SPEED)
      : DEFAULT_SPEED,
  };
}

export function addItem(state, itemText) {
  if (typeof itemText !== "string") return state;
  const text = itemText.trim().slice(0, MAX_TEXT_LENGTH);
  if (!text) return state;

  const nextId =
    state.items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  return {
    ...state,
    score: state.score + POINTS_PER_ITEM,
    items: [...state.items, { id: nextId, text }],
  };
}

export function removeItem(state, id) {
  return {
    ...state,
    items: state.items.filter((item) => item.id !== id),
  };
}

// dt — время кадра в секундах. Скорость задана в пикселях в секунду,
// поэтому на 60 и 120 Гц шарик едет одинаково. Ограничение dt
// не даёт ему «прыгать» после возврата на вкладку.
export function updatePosition(state, dt, maxBounds = 500) {
  const step = Math.min(Math.max(dt, 0), MAX_FRAME_TIME);
  let position = state.position + state.speed * step;
  let speed = state.speed;

  if (position >= maxBounds) {
    position = maxBounds;
    speed = -Math.abs(speed);
  } else if (position <= 0) {
    position = 0;
    speed = Math.abs(speed);
  }

  return { ...state, position, speed };
}

// Любое повреждение сохранения (не JSON, не тот формат, мусор в списке)
// приводит к новой игре, без исключений.
export function parseSaveData(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      isFiniteNumber(parsed.score) &&
      Array.isArray(parsed.items) &&
      parsed.items.every(isValidItem)
    ) {
      return createGameState(parsed);
    }
  } catch {
    // Повреждённое сохранение игнорируем и начинаем заново
  }
  return createGameState();
}
