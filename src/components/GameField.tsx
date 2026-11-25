import { FIELD_WIDTH } from "../gameLogic.ts";
import { useGameSelector } from "../store/GameContext.tsx";

const BALL_SIZE = 30;

export function GameField() {
  const position = useGameSelector((state) => state.position);
  const over = useGameSelector((state) => state.status === "over");

  return (
    <div id="game-area" className={over ? "over" : undefined}>
      <div
        id="ball"
        aria-hidden="true"
        style={{
          width: BALL_SIZE,
          height: BALL_SIZE,
          left: `calc((100% - ${BALL_SIZE}px) * ${position / FIELD_WIDTH})`,
        }}
      />
    </div>
  );
}
