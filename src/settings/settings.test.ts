import { describe, expect, test } from "vitest";
import { SOURCE_BUILTIN, parseSettings, settingsReducer } from "./settings.ts";
import type { Settings } from "./settings.ts";

const base: Settings = { theme: "light", source: SOURCE_BUILTIN };

describe("настройки", () => {
  test("тема и источник слов меняются независимо", () => {
    const dark = settingsReducer(base, { type: "setTheme", theme: "dark" });
    expect(dark).toEqual({ theme: "dark", source: SOURCE_BUILTIN });
    const letter = settingsReducer(dark, { type: "setSource", source: "к" });
    expect(letter).toEqual({ theme: "dark", source: "к" });
  });

  test("неизвестный источник слов не принимается", () => {
    for (const source of ["", "кк", "q", "1"]) {
      const next = settingsReducer(base, { type: "setSource", source });
      expect(next).toBe(base);
    }
  });

  test("корректные сохранённые настройки читаются", () => {
    const saved = JSON.stringify({ theme: "dark", source: "ё" });
    expect(parseSettings(saved)).toEqual({ theme: "dark", source: "ё" });
  });

  test("повреждённые настройки отклоняются", () => {
    const broken = [
      "{",
      "null",
      "[]",
      '{"theme":"red","source":"builtin"}',
      '{"theme":"dark","source":"zz"}',
      '{"theme":"dark"}',
    ];
    for (const json of broken) expect(parseSettings(json), json).toBeNull();
    expect(parseSettings(null)).toBeNull();
  });
});
