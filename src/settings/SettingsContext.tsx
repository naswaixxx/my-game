import {
  createContext,
  use,
  useLayoutEffect,
  useMemo,
  useReducer,
} from "react";
import type { ActionDispatch, ReactNode } from "react";
import { initSettings, saveSettings, settingsReducer } from "./settings.ts";
import type { Settings, SettingsAction } from "./settings.ts";

interface SettingsValue {
  readonly settings: Settings;
  readonly dispatch: ActionDispatch<[SettingsAction]>;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, dispatch] = useReducer(
    settingsReducer,
    undefined,
    initSettings
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useLayoutEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const value = useMemo(() => ({ settings, dispatch }), [settings]);
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsValue {
  const value = use(SettingsContext);
  if (value === null) throw new Error("Нет SettingsProvider выше в дереве");
  return value;
}
