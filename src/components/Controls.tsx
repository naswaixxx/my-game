import { memo } from "react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { MAX_DRAFT_LENGTH } from "../gameLogic.ts";
import { useOnIncrease } from "../hooks/useOnIncrease.ts";

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(0)" },
];

interface ControlsProps {
  readonly draft: string;
  readonly readOnly: boolean;
  readonly misses: number;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onDraftChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onRestart: () => void;
}

export const Controls = memo(function Controls({
  draft,
  readOnly,
  misses,
  inputRef,
  onDraftChange,
  onSubmit,
  onRestart,
}: ControlsProps) {
  useOnIncrease(misses, () => {
    inputRef.current?.animate(SHAKE, { duration: 200 });
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onDraftChange(event.target.value);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) onSubmit();
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
        readOnly={readOnly}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button
        id="submit-btn"
        type="button"
        disabled={readOnly}
        onClick={onSubmit}
      >
        Ввести
      </button>
      <button id="restart-btn" type="button" onClick={onRestart}>
        Новая игра
      </button>
    </div>
  );
});
