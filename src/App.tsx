import confetti from "canvas-confetti";
import { useCallback, useRef } from "react";
import { Controls } from "./components/Controls.tsx";
import { GameField } from "./components/GameField.tsx";
import { Rules } from "./components/Rules.tsx";
import { Stats } from "./components/Stats.tsx";
import { StatusMessage } from "./components/StatusMessage.tsx";
import { WordList } from "./components/WordList.tsx";
import { getLevel, getSpeed, normalizeWord } from "./gameLogic.ts";
import { useGame } from "./hooks/useGame.ts";
import { useOnIncrease } from "./hooks/useOnIncrease.ts";

function celebrate(): void {
  confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
}

export function App() {
  const { state, changeDraft, submit, restart } = useGame();
  const inputRef = useRef<HTMLInputElement>(null);
  const level = getLevel(state);
  const over = state.status === "over";

  useOnIncrease(level, celebrate);

  const handleSubmit = useCallback(() => {
    submit();
    inputRef.current?.focus();
  }, [submit]);

  const handleRestart = useCallback(() => {
    restart();
    inputRef.current?.focus();
  }, [restart]);

  return (
    <main id="app">
      <h1>Словоловка</h1>
      <StatusMessage over={over} />
      <Stats
        score={state.score}
        best={state.best}
        level={level}
        speed={getSpeed(state)}
        queued={state.items.length}
        misses={state.misses}
      />
      <GameField position={state.position} over={over} />
      <WordList items={state.items} prefix={normalizeWord(state.draft)} />
      <Controls
        draft={state.draft}
        readOnly={over}
        misses={state.misses}
        inputRef={inputRef}
        onDraftChange={changeDraft}
        onSubmit={handleSubmit}
        onRestart={handleRestart}
      />
      <Rules />
    </main>
  );
}
