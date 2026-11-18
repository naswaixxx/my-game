import { memo } from "react";
import { MAX_MISSES, MAX_WORDS } from "../gameLogic.ts";

interface StatsProps {
  readonly score: number;
  readonly best: number;
  readonly level: number;
  readonly speed: number;
  readonly queued: number;
  readonly misses: number;
}

export const Stats = memo(function Stats({
  score,
  best,
  level,
  speed,
  queued,
  misses,
}: StatsProps) {
  return (
    <div className="stats">
      <span>
        Счёт <strong id="score">{score}</strong>
      </span>
      <span>
        Рекорд <strong id="best">{best}</strong>
      </span>
      <span>
        Уровень <strong id="level">{level}</strong>
      </span>
      <span>
        Скорость <strong id="speed">{speed}</strong> px/s
      </span>
      <span>
        Очередь{" "}
        <strong id="queue">
          {queued}/{MAX_WORDS}
        </strong>
      </span>
      <span>
        Ошибки{" "}
        <strong id="misses">
          {misses}/{MAX_MISSES}
        </strong>
      </span>
    </div>
  );
});
