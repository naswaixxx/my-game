export type Theme = "light" | "dark";

export const SOURCE_BUILTIN = "builtin";
export const LETTERS = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";

export interface Settings {
  readonly theme: Theme;
  readonly source: string;
}

export type SettingsAction =
  | { readonly type: "setTheme"; readonly theme: Theme }
  | { readonly type: "setSource"; readonly source: string };

const SETTINGS_KEY = "word_catcher_settings_v1";

const isSource = (value: unknown): value is string =>
  value === SOURCE_BUILTIN ||
  (typeof value === "string" && value.length === 1 && LETTERS.includes(value));

export function settingsReducer(
  settings: Settings,
  action: SettingsAction
): Settings {
  switch (action.type) {
    case "setTheme":
      return { ...settings, theme: action.theme };
    case "setSource":
      return isSource(action.source)
        ? { ...settings, source: action.source }
        : settings;
  }
}

export function parseSettings(json: unknown): Settings | null {
  if (typeof json !== "string") return null;
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== "object" || data === null) return null;
    const { theme, source } = data as Record<string, unknown>;
    if (theme !== "light" && theme !== "dark") return null;
    if (!isSource(source)) return null;
    return { theme, source };
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function initSettings(): Settings {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    saved = null;
  }
  return (
    parseSettings(saved) ?? { theme: systemTheme(), source: SOURCE_BUILTIN }
  );
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}
