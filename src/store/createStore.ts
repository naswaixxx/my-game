export interface Store<State, Action> {
  readonly getState: () => State;
  readonly dispatch: (action: Action) => void;
  readonly subscribe: (listener: () => void) => () => void;
}

export function createStore<State, Action>(
  reducer: (state: State, action: Action) => State,
  initial: State
): Store<State, Action> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    dispatch: (action) => {
      const next = reducer(state, action);
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
