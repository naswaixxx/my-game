import { useEffect, useRef } from "react";
import { useLatest } from "./useLatest.ts";

export function useOnIncrease(value: number, onIncrease: () => void): void {
  const previous = useRef(value);
  const latest = useLatest(onIncrease);

  useEffect(() => {
    if (value > previous.current) latest.current();
    previous.current = value;
  }, [value, latest]);
}
