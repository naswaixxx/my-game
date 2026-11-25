import confetti from "canvas-confetti";
import { Controls } from "./components/Controls.tsx";
import { GameField } from "./components/GameField.tsx";
import { Rules } from "./components/Rules.tsx";
import { SourcePanel } from "./components/SourcePanel.tsx";
import { Stats } from "./components/Stats.tsx";
import { StatusMessage } from "./components/StatusMessage.tsx";
import { ThemeToggle } from "./components/ThemeToggle.tsx";
import { WordList } from "./components/WordList.tsx";
import { useGameEngine } from "./game/useGameEngine.ts";
import { getLevel } from "./gameLogic.ts";
import { useOnIncrease } from "./hooks/useOnIncrease.ts";
import { useGameSelector } from "./store/GameContext.tsx";

function celebrate(): void {
  confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
}

export function App() {
  const level = useGameSelector((state) => getLevel(state));
  useGameEngine();
  useOnIncrease(level, celebrate);

  return (
    <main id="app">
      <header className="head">
        <h1>Словоловка</h1>
        <ThemeToggle />
      </header>
      <StatusMessage />
      <Stats />
      <GameField />
      <WordList />
      <Controls />
      <SourcePanel />
      <Rules />
    </main>
  );
}
