export type Direction = 1 | -1;

export type GameStatus = "playing" | "over";

export interface GameState {
  readonly status: GameStatus;
  readonly score: number;
  readonly best: number;
  readonly typed: number;
  readonly misses: number;
  readonly items: readonly string[];
  readonly draft: string;
  readonly position: number;
  readonly direction: Direction;
}

export type GameAction =
  | { readonly type: "tick"; readonly dt: number; readonly roll: number }
  | { readonly type: "input"; readonly value: string }
  | { readonly type: "submit" }
  | { readonly type: "restart"; readonly roll: number };
