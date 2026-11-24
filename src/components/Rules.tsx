import { memo } from "react";
import { MAX_MISSES, MAX_WORDS, WORDS_PER_LEVEL } from "../gameLogic.ts";

export const Rules = memo(function Rules() {
  return (
    <p className="rules">
      Шарик отскакивает от стен, и при каждом ударе в списке появляется новое
      слово. Набирайте слова из списка и нажимайте Enter. Игра заканчивается,
      если в списке больше {MAX_WORDS} слов или вы сделали {MAX_MISSES} ошибок.
      Каждые {WORDS_PER_LEVEL} слов уровень растёт, а шарик ускоряется. Каждая
      ошибка тоже ускоряет шарик.
    </p>
  );
});
