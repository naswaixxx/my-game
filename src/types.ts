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
  readonly seed: number;
}

export type GameAction =
  | {
      readonly type: "tick";
      readonly dt: number;
      readonly pool: readonly string[];
    }
  | { readonly type: "input"; readonly value: string }
  | { readonly type: "submit" }
  | {
      readonly type: "restart";
      readonly seed: number;
      readonly pool: readonly string[];
    };
