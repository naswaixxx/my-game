import { describe, expect, test } from "vitest";
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
  isPlayableWord,
  parseSave,
  submitWord,
} from "./gameLogic.ts";
import type { GameState } from "./types.ts";
import { WORDS } from "./words.ts";

const newGame = (best = 0, seed = 1): GameState =>
  createGame(best, WORDS, seed);

const withWords = (state: GameState, words: readonly string[]): GameState => ({
  ...state,
  items: words,
});

const indexGaps = (pairs: readonly (readonly string[])[]): Set<number> =>
  new Set(pairs.map(([a = "", b = ""]) => WORDS.indexOf(b) - WORDS.indexOf(a)));

describe("начало игры", () => {
  test("новая игра начинается с двух разных слов из пула", () => {
    const state = newGame(7);
    expect(state.items).toHaveLength(2);
    expect(state.items[0]).not.toBe(state.items[1]);
    expect(state.items.every((word) => WORDS.includes(word))).toBe(true);
    expect(state).toMatchObject({
      score: 0,
      best: 7,
      draft: "",
      status: "playing",
    });
  });

  test("слова берутся только из переданного пула", () => {
    const pool = ["лиса", "волк", "заяц"];
    for (let seed = 0; seed < 50; seed++) {
      const state = createGame(0, pool, seed);
      expect(state.items.every((word) => pool.includes(word))).toBe(true);
    }
  });

  test("если в пуле одно слово, игра стартует с одним словом", () => {
    expect(createGame(0, ["лиса"], 3).items).toEqual(["лиса"]);
  });

  test("при одинаковом seed слова одинаковые, при разном — разные", () => {
    expect(newGame(0, 5).items).toEqual(newGame(0, 5).items);
    const variants = new Set(
      Array.from({ length: 40 }, (_, seed) => newGame(0, seed).items.join())
    );
    expect(variants.size).toBeGreaterThan(20);
  });

  test("два стартовых слова выбираются независимо друг от друга", () => {
    const pairs = Array.from({ length: 200 }, (_, seed) => [
      ...newGame(0, seed).items,
    ]);
    expect(indexGaps(pairs).size).toBeGreaterThan(15);
  });

  test("несколько ударов за один кадр дают независимо выбранные слова", () => {
    const pairs = Array.from({ length: 200 }, (_, seed) => {
      const empty = { ...newGame(0, seed), items: [] };
      return [...advance(empty, 1, 40, WORDS).items.slice(0, 2)];
    });
    expect(indexGaps(pairs).size).toBeGreaterThan(15);
  });
});

describe("ввод слов и очки", () => {
  test("правильное слово удаляется из списка и даёт очки по длине слова", () => {
    const state = withWords(newGame(), ["цикл", "файл"]);
    const next = submitWord(state, "цикл");
    expect(next.items).toEqual(["файл"]);
    expect(next).toMatchObject({ score: 4, best: 4, typed: 1 });
    expect(state.items).toHaveLength(2);
  });

  test("очки умножаются на уровень", () => {
    const state = { ...withWords(newGame(), ["цикл"]), typed: 5 };
    expect(submitWord(state, "цикл").score).toBe(8);
  });

  test("регистр, пробелы и форма записи символов не важны", () => {
    const state = withWords(newGame(), ["байт"]);
    expect(submitWord(state, "  БаЙт ").items).toHaveLength(0);
    expect(submitWord(state, "байт").items).toHaveLength(0);
  });

  test("неправильное слово не даёт очков и считается ошибкой", () => {
    const state = withWords(newGame(), ["цикл"]);
    const next = submitWord(state, "файл");
    expect(next).toMatchObject({ score: 0, misses: 1 });
    expect(next.items).toBe(state.items);
  });

  test("одно и то же слово нельзя ввести дважды ради очков", () => {
    const state = withWords(newGame(), ["цикл", "файл"]);
    const once = submitWord(state, "цикл");
    const twice = submitWord(once, "цикл");
    expect(twice.score).toBe(once.score);
    expect(twice.misses).toBe(1);
  });

  test("пустой ввод ничего не меняет", () => {
    const state = newGame();
    expect(submitWord(state, "")).toBe(state);
    expect(submitWord(state, "   ")).toBe(state);
  });

  test("рекорд растёт вместе со счётом и не падает при новой игре", () => {
    const state = withWords({ ...newGame(), best: 100 }, ["цикл"]);
    expect(submitWord(state, "цикл").best).toBe(100);
  });
});

describe("уровень, скорость и конец игры", () => {
  test("каждые 5 слов уровень растёт и шарик едет быстрее", () => {
    const slow = { ...newGame(), typed: 4 };
    const fast = { ...slow, typed: 5 };
    expect(getLevel(slow)).toBe(1);
    expect(getLevel(fast)).toBe(2);
    expect(getSpeed(fast)).toBeGreaterThan(getSpeed(slow));

    const moved = (state: GameState): number =>
      advance(state, 0.1, 1000, WORDS).position;
    expect(moved(fast)).toBeGreaterThan(moved(slow));
  });

  test("каждая ошибка ускоряет шарик, но не выше предела", () => {
    const clean = newGame();
    const wrong = submitWord(clean, "нетслова");
    expect(getSpeed(wrong)).toBeGreaterThan(getSpeed(clean));

    const expert = { ...clean, typed: 1000 };
    expect(getSpeed(expert)).toBeLessThanOrEqual(520);
    expect(getSpeed(expert)).toBe(getSpeed({ ...expert, typed: 2000 }));
  });

  test("игра заканчивается после максимального числа ошибок", () => {
    let state = withWords(newGame(), ["цикл"]);
    for (let i = 1; i < MAX_MISSES; i++) {
      state = submitWord(state, "нетслова");
      expect(state.status).toBe("playing");
    }
    state = submitWord(state, "нетслова");
    expect(state.misses).toBe(MAX_MISSES);
    expect(state.status).toBe("over");
    expect(submitWord(state, "цикл")).toBe(state);
    expect(advance(state, 0.1, 500, WORDS)).toBe(state);
  });

  test("игра заканчивается, когда в списке больше слов, чем разрешено", () => {
    const crowded = withWords(
      { ...newGame(), position: 99 },
      WORDS.slice(0, MAX_WORDS)
    );
    const over = advance(crowded, 0.1, 100, WORDS);
    expect(over.status).toBe("over");
    expect(over.items).toHaveLength(MAX_WORDS + 1);
    expect(advance(over, 0.1, 100, WORDS)).toBe(over);
    expect(submitWord(over, over.items[0] ?? "")).toBe(over);
  });
});

describe("движение шарика", () => {
  test("при ударе о стену остаток движения не теряется", () => {
    const next = advance({ ...newGame(), position: 90 }, 0.1, 100, WORDS);
    expect(next.position).toBeCloseTo(94, 9);
    expect(next.direction).toBe(-1);
  });

  test("кадр с большой задержкой учитывает всё прошедшее время", () => {
    expect(advance(newGame(), 2.5, 1000, WORDS).position).toBeCloseTo(400, 9);
  });

  test("за 30 секунд с отскоками шарик в одном месте при любой частоте кадров", () => {
    const run = (hz: number): GameState => {
      let state = newGame();
      for (let i = 0; i < hz * 30; i++) {
        state = advance({ ...state, items: [] }, 1 / hz, 500, WORDS);
      }
      return state;
    };
    for (const hz of [5, 60, 144]) {
      const state = run(hz);
      expect(state.position).toBeCloseTo(200, 5);
      expect(state.direction).toBe(-1);
    }
  });

  test("за один кадр несколько ударов о стену дают несколько слов", () => {
    const state = { ...newGame(), items: [] };
    expect(advance(state, 1, 40, WORDS).items).toHaveLength(4);
  });

  test("слово появляется при ударе о стену и сразу, если список пуст", () => {
    const nearWall = { ...newGame(), position: 99 };
    const bounced = advance(nearWall, 0.1, 100, WORDS);
    expect(bounced.items).toHaveLength(nearWall.items.length + 1);

    const calm = advance(nearWall, 0.01, 1000, WORDS);
    expect(calm.items).toBe(nearWall.items);

    const empty = advance({ ...nearWall, items: [] }, 0.01, 1000, WORDS);
    expect(empty.items).toHaveLength(1);
  });

  test("новое слово не повторяет уже стоящее в списке", () => {
    const pool = ["лиса", "волк"];
    const state = { ...createGame(0, pool, 4), items: ["лиса"] };
    const next = advance(state, 1, 40, pool);
    expect(next.items).toEqual(["лиса", "волк"]);
  });
});

describe("редьюсер", () => {
  test("ввод меняет черновик и ограничен по длине", () => {
    const state = newGame();
    const typed = gameReducer(state, { type: "input", value: "ци" });
    expect(typed.draft).toBe("ци");
    expect(typed.items).toBe(state.items);

    const long = gameReducer(state, { type: "input", value: "а".repeat(50) });
    expect(long.draft).toHaveLength(MAX_DRAFT_LENGTH);

    const over: GameState = { ...state, status: "over" };
    expect(gameReducer(over, { type: "input", value: "ц" })).toBe(over);
  });

  test("отправка берёт слово из черновика, очищает его и не срабатывает дважды", () => {
    const state: GameState = {
      ...withWords(newGame(), ["цикл", "файл"]),
      draft: " ЦИКЛ ",
    };
    const once = gameReducer(state, { type: "submit" });
    expect(once.items).toEqual(["файл"]);
    expect(once.score).toBe(4);
    expect(once.draft).toBe("");
    expect(gameReducer(once, { type: "submit" })).toBe(once);
  });

  test("неверный черновик при отправке считается ошибкой и очищается", () => {
    const state: GameState = { ...newGame(), draft: "нетслова" };
    const next = gameReducer(state, { type: "submit" });
    expect(next.misses).toBe(1);
    expect(next.draft).toBe("");
  });

  test("кадр двигает шарик и берёт новые слова из пула кадра", () => {
    const empty: GameState = { ...newGame(), items: [] };
    const next = gameReducer(empty, {
      type: "tick",
      dt: 0.01,
      pool: ["лиса"],
    });
    expect(next.items).toEqual(["лиса"]);

    const moving = gameReducer(newGame(), {
      type: "tick",
      dt: 0.1,
      pool: WORDS,
    });
    expect(moving.position).toBeGreaterThan(0);
    expect(moving.position).toBeLessThan(FIELD_WIDTH);
  });

  test("новая игра сохраняет рекорд и не зависит от прошлой партии", () => {
    const lost: GameState = {
      ...withWords(newGame(), ["цикл"]),
      status: "over",
      score: 40,
      best: 40,
      typed: 10,
      misses: MAX_MISSES,
      draft: "аб",
    };
    const action = { type: "restart", seed: 9, pool: WORDS } as const;
    const fresh = gameReducer(lost, action);
    expect(fresh).toMatchObject({
      best: 40,
      score: 0,
      misses: 0,
      draft: "",
      status: "playing",
    });
    expect(fresh.items).toHaveLength(2);
    expect(fresh.items[0]).not.toBe(fresh.items[1]);
    expect(gameReducer(lost, action)).toEqual(fresh);
  });

  test("новая игра берёт слова из нового пула", () => {
    const fresh = gameReducer(newGame(), {
      type: "restart",
      seed: 2,
      pool: ["лиса", "волк"],
    });
    expect([...fresh.items].sort()).toEqual(["волк", "лиса"]);
  });
});

describe("сохранение", () => {
  const restore = (state: GameState): GameState | null =>
    parseSave(JSON.stringify(state), state.seed);

  test("корректное сохранение восстанавливается полностью", () => {
    const playing: GameState = {
      ...newGame(5),
      draft: "ци",
      position: 123.5,
      direction: -1,
    };
    expect(restore(playing)).toEqual(playing);

    const crowded = withWords(newGame(), WORDS.slice(0, MAX_WORDS + 1));
    const over: GameState = { ...crowded, status: "over" };
    expect(restore(over)).toEqual(over);

    const lost: GameState = {
      ...newGame(),
      misses: MAX_MISSES,
      status: "over",
    };
    expect(restore(lost)).toEqual(lost);

    const played: GameState = { ...newGame(), typed: 6, score: 40, best: 40 };
    expect(restore(played)).toEqual(played);
  });

  test("позиция и направление шарика восстанавливаются точно", () => {
    const state: GameState = { ...newGame(), position: 417.25, direction: -1 };
    const restored = restore(state);
    expect(restored?.position).toBe(417.25);
    expect(restored?.direction).toBe(-1);
  });

  test("seed не берётся из сохранения", () => {
    const restored = parseSave(JSON.stringify({ ...newGame(), seed: 5 }), 99);
    expect(restored?.seed).toBe(99);
  });

  test("слова, которых больше нет у партнёра, не портят сохранение", () => {
    const state = withWords(newGame(), ["исчезнувшее", "вымершее-слово"]);
    expect(restore(state)?.items).toEqual(["исчезнувшее", "вымершее-слово"]);
  });

  test("лишние поля в сохранении отбрасываются", () => {
    const base = newGame();
    const dirty = { ...base, evil: "x".repeat(100), nested: { a: 1 } };
    expect(parseSave(JSON.stringify(dirty), base.seed)).toEqual(base);
  });

  test("повреждённое сохранение отклоняется", () => {
    const base = newGame();
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
      { ...base, items: ["Цикл"] },
      { ...base, items: ["word"] },
      { ...base, items: ["да"] },
      { ...base, items: ["цикл", "цикл"] },
      withWords(base, WORDS.slice(0, MAX_WORDS + 1)),
    ];
    for (const save of broken) {
      const raw =
        typeof save === "object" && save !== null ? JSON.stringify(save) : save;
      expect(parseSave(raw, 1), String(raw)).toBeNull();
    }
  });
});

describe("допустимые слова", () => {
  test("все слова встроенного словаря допустимы", () => {
    expect(WORDS.every(isPlayableWord)).toBe(true);
  });

  test("слова с пробелами, цифрами, латиницей и слишком короткие отклоняются", () => {
    for (const word of [
      "красная площадь",
      "слово1",
      "word",
      "да",
      "Кошка",
      "",
    ]) {
      expect(isPlayableWord(word), word).toBe(false);
    }
    expect(isPlayableWord("кто-нибудь")).toBe(true);
  });
});
