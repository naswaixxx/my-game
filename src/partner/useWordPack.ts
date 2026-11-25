import { useCallback, useEffect, useState } from "react";
import { SOURCE_BUILTIN } from "../settings/settings.ts";
import { loadWords } from "./api.ts";

export type Load =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly words: readonly string[] };

interface Settled {
  readonly key: string;
  readonly load: Load;
}

const IDLE: Load = { status: "idle" };
const LOADING: Load = { status: "loading" };

export interface WordPack {
  readonly load: Load;
  readonly retry: () => void;
}

export function useWordPack(source: string): WordPack {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const key = `${source}#${attempt}`;

  useEffect(() => {
    if (source === SOURCE_BUILTIN) return undefined;
    const controller = new AbortController();
    loadWords(source, controller.signal).then(
      (words) => {
        if (controller.signal.aborted) return;
        setSettled({ key, load: { status: "ready", words } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "сбой";
        setSettled({ key, load: { status: "error", message } });
      }
    );
    return () => controller.abort();
  }, [source, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (source === SOURCE_BUILTIN) return { load: IDLE, retry };
  return { load: settled?.key === key ? settled.load : LOADING, retry };
}
