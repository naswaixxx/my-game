import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { MAX_DRAFT_LENGTH } from "../gameLogic.ts";
import { useGameActions } from "../game/useGameActions.ts";
import { useOnIncrease } from "../hooks/useOnIncrease.ts";
import { useGameSelector } from "../store/GameContext.tsx";

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(0)" },
];

export function Controls() {
  const draft = useGameSelector((state) => state.draft);
  const over = useGameSelector((state) => state.status === "over");
  const misses = useGameSelector((state) => state.misses);
  const { changeDraft, submit, restart } = useGameActions();
  const inputRef = useRef<HTMLInputElement>(null);

  useOnIncrease(misses, () => {
    inputRef.current?.animate(SHAKE, { duration: 200 });
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    changeDraft(event.target.value);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) submit();
  };
  const handleSubmit = (): void => {
    submit();
    inputRef.current?.focus();
  };
  const handleRestart = (): void => {
    restart();
    inputRef.current?.focus();
  };

  return (
    <div className="controls">
      <label htmlFor="word-input" className="visually-hidden">
        Введите слово
      </label>
      <input
        id="word-input"
        ref={inputRef}
        type="text"
        maxLength={MAX_DRAFT_LENGTH}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        autoFocus
        placeholder="Введите слово..."
        value={draft}
        readOnly={over}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button
        id="submit-btn"
        type="button"
        disabled={over}
        onClick={handleSubmit}
      >
        Ввести
      </button>
      <button id="restart-btn" type="button" onClick={handleRestart}>
        Новая игра
      </button>
    </div>
  );
}
