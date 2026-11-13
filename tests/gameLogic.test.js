import assert from "node:assert";
import { test } from "node:test";
import {
  MAX_MISSES,
  MAX_WORDS,
  advance,
  createGame,
  getLevel,
  getSpeed,
  parseBall,
  parseSave,
  submitWord,
} from "../src/gameLogic.js";
import { WORDS } from "../src/words.js";

const first = () => 0;

const withWords = (state, words) => ({ ...state, items: words });

test("новая игра начинается с двух разных слов из словаря", () => {
  const state = createGame(7, first);
  assert.strictEqual(state.items.length, 2);
  assert.notStrictEqual(state.items[0], state.items[1]);
  assert.ok(state.items.every((word) => WORDS.includes(word)));
  assert.strictEqual(state.score, 0);
  assert.strictEqual(state.best, 7);
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

test("регистр и пробелы вокруг слова не важны", () => {
  const state = withWords(createGame(0, first), ["цикл"]);
  const next = submitWord(state, "  ЦиКл ");
  assert.strictEqual(next.items.length, 0);
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

  const moved = (state) => advance(state, 0.1, 1000, first).position;
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

test("при ударе о стену остаток движения не теряется", () => {
  const state = { ...createGame(0, first), position: 90, direction: 1 };
  const next = advance(state, 0.1, 100, first);
  assert.ok(Math.abs(next.position - 94) < 1e-9);
  assert.strictEqual(next.direction, -1);
});

test("после долгого простоя шарик не прыгает дальше одного кадра", () => {
  const state = createGame(0, first);
  const next = advance(state, 2.5, 1000, first);
  assert.ok(Math.abs(next.position - 16) < 1e-9);
});

test("за 30 секунд с отскоками шарик в одном месте на 60 и 144 Гц", () => {
  const run = (hz) => {
    let state = createGame(0, first);
    for (let i = 0; i < hz * 30; i++) {
      state = advance({ ...state, items: [] }, 1 / hz, 500, first);
    }
    return state;
  };
  const slow = run(60);
  const fast = run(144);
  assert.ok(Math.abs(slow.position - 200) < 1e-6);
  assert.ok(Math.abs(fast.position - 200) < 1e-6);
  assert.strictEqual(slow.direction, -1);
  assert.strictEqual(fast.direction, -1);
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
  assert.strictEqual(submitWord(over, over.items[0]), over);
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

test("корректное сохранение восстанавливается полностью", () => {
  const playing = createGame(5, first);
  assert.deepStrictEqual(parseSave(JSON.stringify(playing)), playing);

  const crowded = withWords(
    createGame(0, first),
    WORDS.slice(0, MAX_WORDS + 1)
  );
  const over = { ...crowded, status: "over" };
  assert.deepStrictEqual(parseSave(JSON.stringify(over)), over);

  const lost = { ...createGame(0, first), misses: MAX_MISSES, status: "over" };
  assert.deepStrictEqual(parseSave(JSON.stringify(lost)), lost);
});

test("повреждённое сохранение отклоняется", () => {
  const base = createGame(0, first);
  const broken = [
    "{ invalid_json: true, ",
    "",
    null,
    undefined,
    "null",
    "42",
    "[]",
    '{"score":20,"items":[],"position":"сломано","speed":"сломано"}',
    { ...base, score: -1 },
    { ...base, score: 1.5 },
    { ...base, score: 9007199254740992, best: 9007199254740992 },
    { ...base, score: 10, best: 5 },
    { ...base, position: -1 },
    { ...base, position: null },
    { ...base, direction: 0 },
    { ...base, status: "paused" },
    { ...base, status: "over" },
    { ...base, misses: MAX_MISSES },
    { ...base, misses: MAX_MISSES + 1, status: "over" },
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

test("положение шарика восстанавливается только из корректных данных", () => {
  const ball = { position: 123.5, direction: -1 };
  assert.deepStrictEqual(parseBall(JSON.stringify(ball)), ball);
  assert.deepStrictEqual(
    parseBall(JSON.stringify({ ...createGame(0, first), ...ball })),
    ball
  );

  const broken = [
    "{ invalid_json: true, ",
    "",
    null,
    undefined,
    "null",
    '{"position":"сломано","direction":1}',
    '{"position":5,"direction":0}',
    '{"position":-1,"direction":1}',
    '{"position":null,"direction":1}',
  ];
  for (const raw of broken) {
    assert.strictEqual(parseBall(raw), null, String(raw));
  }
});
