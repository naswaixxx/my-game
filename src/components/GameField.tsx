import { memo } from "react";
import { FIELD_WIDTH } from "../gameLogic.ts";

const BALL_SIZE = 30;

interface GameFieldProps {
  readonly position: number;
  readonly over: boolean;
}

export const GameField = memo(function GameField({
  position,
  over,
}: GameFieldProps) {
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
});
