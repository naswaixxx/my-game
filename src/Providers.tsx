import type { ReactNode } from "react";
import { WordsProvider } from "./partner/WordsContext.tsx";
import { SettingsProvider } from "./settings/SettingsContext.tsx";
import { GameProvider } from "./store/GameContext.tsx";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <WordsProvider>
        <GameProvider>{children}</GameProvider>
      </WordsProvider>
    </SettingsProvider>
  );
}
