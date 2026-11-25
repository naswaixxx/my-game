import { MAX_MISSES, MAX_WORDS, getLevel, getSpeed } from "../gameLogic.ts";
import { useGameSelector } from "../store/GameContext.tsx";

export function Stats() {
  const score = useGameSelector((state) => state.score);
  const best = useGameSelector((state) => state.best);
  const typed = useGameSelector((state) => state.typed);
  const misses = useGameSelector((state) => state.misses);
  const queued = useGameSelector((state) => state.items.length);
  const level = getLevel({ typed });
  const speed = getSpeed({ typed, misses });

  return (
    <ul className="stats" aria-label="Статистика">
      <li>
        Счёт <strong id="score">{score}</strong>
      </li>
      <li>
        Рекорд <strong id="best">{best}</strong>
      </li>
      <li>
        Уровень <strong id="level">{level}</strong>
      </li>
      <li>
        Скорость <strong id="speed">{speed}</strong> px/s
      </li>
      <li>
        Очередь{" "}
        <strong id="queue">
          {queued}/{MAX_WORDS}
        </strong>
      </li>
      <li>
        Ошибки{" "}
        <strong id="misses">
          {misses}/{MAX_MISSES}
        </strong>
      </li>
    </ul>
  );
}
