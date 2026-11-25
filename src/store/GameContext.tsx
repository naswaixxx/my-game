import { createContext, use, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { gameReducer } from "../gameLogic.ts";
import { initGame } from "../storage.ts";
import type { GameAction, GameState } from "../types.ts";
import { createStore } from "./createStore.ts";
import type { Store } from "./createStore.ts";

export type GameStore = Store<GameState, GameAction>;

const GameStoreContext = createContext<GameStore | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createStore(gameReducer, initGame()));
  return <GameStoreContext value={store}>{children}</GameStoreContext>;
}

export function useGameStore(): GameStore {
  const store = use(GameStoreContext);
  if (store === null) throw new Error("Нет GameProvider выше в дереве");
  return store;
}

export function useGameSelector<T>(select: (state: GameState) => T): T {
  const store = useGameStore();
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
