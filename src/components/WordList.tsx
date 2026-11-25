import { normalizeWord } from "../gameLogic.ts";
import { useGameSelector } from "../store/GameContext.tsx";

export function WordList() {
  const items = useGameSelector((state) => state.items);
  const prefix = normalizeWord(useGameSelector((state) => state.draft));

  return (
    <ul id="words" aria-label="Слова в очереди">
      {items.map((word) => (
        <li
          key={word}
          className={
            prefix !== "" && word.startsWith(prefix) ? "match" : undefined
          }
        >
          {word}
        </li>
      ))}
    </ul>
  );
}
