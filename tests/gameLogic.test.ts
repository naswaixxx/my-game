import assert from "node:assert";
import { test } from "node:test";
import {
  FIELD_WIDTH,
  MAX_DRAFT_LENGTH,
  MAX_MISSES,
  MAX_WORDS,
  advance,
  createGame,
  gameReducer,
  getLevel,
  getSpeed,
  parseSave,
  submitWord,
} from "../src/gameLogic.ts";
import type { GameState } from "../src/types.ts";
import { WORDS } from "../src/words.ts";

const first = (): number => 0;

const withWords = (state: GameState, words: readonly string[]): GameState => ({
  ...state,
  items: words,
});

test("новая игра начинается с двух разных слов из словаря", () => {
  const state = createGame(7, first);
  assert.strictEqual(state.items.length, 2);
  assert.notStrictEqual(state.items[0], state.items[1]);
  assert.ok(state.items.every((word) => WORDS.includes(word)));
  assert.strictEqual(state.score, 0);
  assert.strictEqual(state.best, 7);
  assert.strictEqual(state.draft, "");
  assert.strictEqual(state.status, "playing");
});

test("правильное слово удаляется из списка и даёт очки по длине слова", () => {
  const state = withWords(createGame(0, first), ["цикл", "файл"]);
  const next = submitWord(state, "цикл");
  assert.deepStrictEqual(next.items, ["файл"]);
  assert.strictEqual(next.score, 4);
  assert.strictEqual(next.best, 4);
  assert.strictEqual(next.typed, 1);
  assert.strictEqual(state.items.length, 2);
});

test("регистр, пробелы и форма записи символов не важны", () => {
  const state = withWords(createGame(0, first), ["байт"]);
  assert.strictEqual(submitWord(state, "  БаЙт ").items.length, 0);
  assert.strictEqual(submitWord(state, "байт").items.length, 0);
});

test("неправильное слово не даёт очков и считается ошибкой", () => {
  const state = withWords(createGame(0, first), ["цикл"]);
  const next = submitWord(state, "файл");
  assert.strictEqual(next.score, 0);
  assert.strictEqual(next.misses, 1);
  assert.strictEqual(next.items, state.items);
});

test("одно и то же слово нельзя ввести дважды ради очков", () => {
  const state = withWords(createGame(0, first), ["цикл", "файл"]);
  const once = submitWord(state, "цикл");
  const twice = submitWord(once, "цикл");
  assert.strictEqual(twice.score, once.score);
  assert.strictEqual(twice.misses, 1);
});

test("пустой ввод ничего не меняет", () => {
  const state = createGame(0, first);
  assert.strictEqual(submitWord(state, ""), state);
  assert.strictEqual(submitWord(state, "   "), state);
});

test("каждые 5 слов уровень растёт и шарик едет быстрее", () => {
  const slow = { ...createGame(0, first), typed: 4 };
  const fast = { ...slow, typed: 5 };
  assert.strictEqual(getLevel(slow), 1);
  assert.strictEqual(getLevel(fast), 2);
  assert.ok(getSpeed(fast) > getSpeed(slow));

  const moved = (state: GameState): number =>
    advance(state, 0.1, 1000, first).position;
  assert.ok(moved(fast) > moved(slow));
});

test("каждая ошибка ускоряет шарик, но не выше предела", () => {
  const clean = createGame(0, first);
  const wrong = submitWord(clean, "нетслова");
  assert.ok(getSpeed(wrong) > getSpeed(clean));

  const expert = { ...clean, typed: 1000 };
  assert.ok(getSpeed(expert) <= 520);
  assert.strictEqual(getSpeed(expert), getSpeed({ ...expert, typed: 2000 }));
});

test("игра заканчивается после максимального числа ошибок", () => {
  let state = withWords(createGame(0, first), ["цикл"]);
  for (let i = 1; i < MAX_MISSES; i++) {
    state = submitWord(state, "нетслова");
    assert.strictEqual(state.status, "playing");
  }
  state = submitWord(state, "нетслова");
  assert.strictEqual(state.misses, MAX_MISSES);
  assert.strictEqual(state.status, "over");
  assert.strictEqual(submitWord(state, "цикл"), state);
  assert.strictEqual(advance(state, 0.1, 500, first), state);
});

test("при ударе о стену остаток движения не теряется", () => {
  const state = { ...createGame(0, first), position: 90 };
  const next = advance(state, 0.1, 100, first);
  assert.ok(Math.abs(next.position - 94) < 1e-9);
  assert.strictEqual(next.direction, -1);
});

test("кадр с большой задержкой учитывает всё прошедшее время", () => {
  const next = advance(createGame(0, first), 2.5, 1000, first);
  assert.ok(Math.abs(next.position - 400) < 1e-9);
});

test("за 30 секунд с отскоками шарик в одном месте при любой частоте кадров", () => {
  const run = (hz: number): GameState => {
    let state = createGame(0, first);
    for (let i = 0; i < hz * 30; i++) {
      state = advance({ ...state, items: [] }, 1 / hz, 500, first);
    }
    return state;
  };
  for (const hz of [5, 60, 144]) {
    const state = run(hz);
    assert.ok(Math.abs(state.position - 200) < 1e-6, `${hz} Гц`);
    assert.strictEqual(state.direction, -1, `${hz} Гц`);
  }
});

test("за один кадр несколько ударов о стену дают несколько слов", () => {
  const state = { ...createGame(0, first), items: [] };
  const next = advance(state, 1, 40, first);
  assert.strictEqual(next.items.length, 4);
});

test("слово появляется при ударе о стену и сразу, если список пуст", () => {
  const nearWall = { ...createGame(0, first), position: 99 };
  const bounced = advance(nearWall, 0.1, 100, first);
  assert.strictEqual(bounced.items.length, nearWall.items.length + 1);

  const calm = advance(nearWall, 0.01, 1000, first);
  assert.strictEqual(calm.items, nearWall.items);

  const empty = advance({ ...nearWall, items: [] }, 0.01, 1000, first);
  assert.strictEqual(empty.items.length, 1);
});

test("игра заканчивается, когда в списке больше слов, чем разрешено", () => {
  const crowded = withWords(
    { ...createGame(0, first), position: 99 },
    WORDS.slice(0, MAX_WORDS)
  );
  const over = advance(crowded, 0.1, 100, first);
  assert.strictEqual(over.status, "over");
  assert.strictEqual(over.items.length, MAX_WORDS + 1);
  assert.strictEqual(advance(over, 0.1, 100, first), over);
  assert.strictEqual(submitWord(over, over.items[0] ?? ""), over);
});

test("ввод меняет черновик и ограничен по длине", () => {
  const state = createGame(0, first);
  const typed = gameReducer(state, { type: "input", value: "ци" });
  assert.strictEqual(typed.draft, "ци");
  assert.strictEqual(typed.items, state.items);

  const long = gameReducer(state, { type: "input", value: "а".repeat(50) });
  assert.strictEqual(long.draft.length, MAX_DRAFT_LENGTH);

  const over: GameState = { ...state, status: "over" };
  assert.strictEqual(gameReducer(over, { type: "input", value: "ц" }), over);
});

test("отправка берёт слово из черновика, очищает его и не срабатывает дважды", () => {
  const state: GameState = {
    ...withWords(createGame(0, first), ["цикл", "файл"]),
    draft: " ЦИКЛ ",
  };
  const once = gameReducer(state, { type: "submit" });
  assert.deepStrictEqual(once.items, ["файл"]);
  assert.strictEqual(once.score, 4);
  assert.strictEqual(once.draft, "");

  const twice = gameReducer(once, { type: "submit" });
  assert.strictEqual(twice, once);
});

test("неверный черновик при отправке считается ошибкой и очищается", () => {
  const state: GameState = { ...createGame(0, first), draft: "нетслова" };
  const next = gameReducer(state, { type: "submit" });
  assert.strictEqual(next.misses, 1);
  assert.strictEqual(next.draft, "");
});

test("кадр двигает шарик, а слово при появлении выбирается по броску", () => {
  const empty: GameState = { ...createGame(0, first), items: [] };
  const low = gameReducer(empty, { type: "tick", dt: 0.01, roll: 0 });
  assert.deepStrictEqual(low.items, [WORDS[0]]);
  const high = gameReducer(empty, { type: "tick", dt: 0.01, roll: 0.999 });
  assert.deepStrictEqual(high.items, [WORDS[WORDS.length - 1]]);

  const moving = gameReducer(createGame(0, first), {
    type: "tick",
    dt: 0.1,
    roll: 0.5,
  });
  assert.ok(moving.position > 0 && moving.position < FIELD_WIDTH);
});

test("новая игра сохраняет рекорд и не зависит от прошлой партии", () => {
  const lost: GameState = {
    ...withWords(createGame(0, first), ["цикл"]),
    status: "over",
    score: 40,
    best: 40,
    typed: 10,
    misses: MAX_MISSES,
    draft: "аб",
  };
  const action = { type: "restart", roll: 0.3 } as const;
  const fresh = gameReducer(lost, action);
  assert.strictEqual(fresh.best, 40);
  assert.strictEqual(fresh.score, 0);
  assert.strictEqual(fresh.misses, 0);
  assert.strictEqual(fresh.draft, "");
  assert.strictEqual(fresh.status, "playing");
  assert.strictEqual(fresh.items.length, 2);
  assert.notStrictEqual(fresh.items[0], fresh.items[1]);
  assert.deepStrictEqual(gameReducer(lost, action), fresh);
});

test("корректное сохранение восстанавливается полностью", () => {
  const playing: GameState = {
    ...createGame(5, first),
    draft: "ци",
    position: 123.5,
    direction: -1,
  };
  assert.deepStrictEqual(parseSave(JSON.stringify(playing)), playing);

  const crowded = withWords(
    createGame(0, first),
    WORDS.slice(0, MAX_WORDS + 1)
  );
  const over: GameState = { ...crowded, status: "over" };
  assert.deepStrictEqual(parseSave(JSON.stringify(over)), over);

  const lost: GameState = {
    ...createGame(0, first),
    misses: MAX_MISSES,
    status: "over",
  };
  assert.deepStrictEqual(parseSave(JSON.stringify(lost)), lost);

  const played: GameState = {
    ...createGame(0, first),
    typed: 6,
    score: 40,
    best: 40,
  };
  assert.deepStrictEqual(parseSave(JSON.stringify(played)), played);
});

test("лишние поля в сохранении отбрасываются", () => {
  const base = createGame(0, first);
  const dirty = { ...base, evil: "x".repeat(100), nested: { a: 1 } };
  assert.deepStrictEqual(parseSave(JSON.stringify(dirty)), base);
});

test("повреждённое сохранение отклоняется", () => {
  const base = createGame(0, first);
  const broken: unknown[] = [
    "{ invalid_json: true, ",
    "",
    null,
    undefined,
    "null",
    "42",
    "[]",
    '{"score":20,"items":[],"position":"сломано","speed":"сломано"}',
    { ...base, typed: 1000000 },
    { ...base, typed: 1000000, score: 0, best: 0 },
    { ...base, typed: 1, score: 1000 },
    { ...base, typed: 1, score: 1 },
    { ...base, score: -1 },
    { ...base, score: 1.5 },
    { ...base, score: 9007199254740992, best: 9007199254740992 },
    { ...base, score: 10, best: 5 },
    { ...base, position: -1 },
    { ...base, position: null },
    { ...base, position: FIELD_WIDTH + 1 },
    { ...base, status: "over", position: 50000 },
    { ...base, direction: 0 },
    { ...base, status: "paused" },
    { ...base, status: "over" },
    { ...base, misses: MAX_MISSES },
    { ...base, misses: MAX_MISSES + 1, status: "over" },
    { ...base, draft: 5 },
    { ...base, draft: undefined },
    { ...base, draft: "а".repeat(MAX_DRAFT_LENGTH + 1) },
    { ...base, items: "нет" },
    { ...base, items: [1, null] },
    { ...base, items: [{ id: 1, text: "цикл" }] },
    { ...base, items: ["  "] },
    { ...base, items: [" цикл "] },
    { ...base, items: ["а".repeat(10000)] },
    { ...base, items: ["привет"] },
    { ...base, items: ["цикл", "цикл"] },
    withWords(base, WORDS.slice(0, MAX_WORDS + 1)),
  ];
  for (const save of broken) {
    const raw =
      typeof save === "object" && save !== null ? JSON.stringify(save) : save;
    assert.strictEqual(parseSave(raw), null, String(raw));
  }
});
