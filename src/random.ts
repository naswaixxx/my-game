const SEED_RANGE = 4294967296;

export function createSeed(): number {
  return Math.floor(Math.random() * SEED_RANGE);
}

export function nextRandom(seed: number): readonly [number, number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / SEED_RANGE, next];
}
