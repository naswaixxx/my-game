import { createContext, use, useMemo } from "react";
import type { ReactNode } from "react";
import { useSettings } from "../settings/SettingsContext.tsx";
import { WORDS } from "../words.ts";
import { useWordPack } from "./useWordPack.ts";
import type { Load } from "./useWordPack.ts";

interface WordsValue {
  readonly load: Load;
  readonly retry: () => void;
}

const WordsContext = createContext<WordsValue | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { load, retry } = useWordPack(settings.source);
  const value = useMemo(() => ({ load, retry }), [load, retry]);
  return <WordsContext value={value}>{children}</WordsContext>;
}

export function useWords(): WordsValue {
  const value = use(WordsContext);
  if (value === null) throw new Error("Нет WordsProvider выше в дереве");
  return value;
}

export function usePool(): readonly string[] {
  const { load } = useWords();
  return load.status === "ready" && load.words.length > 0 ? load.words : WORDS;
}
