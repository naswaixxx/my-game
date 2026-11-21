import { memo } from "react";

interface WordListProps {
  readonly items: readonly string[];
  readonly prefix: string;
}

export const WordList = memo(function WordList({
  items,
  prefix,
}: WordListProps) {
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
});
