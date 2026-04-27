/**
 * Deterministic ID generator. We use a counter+prefix instead of UUID so seeded
 * data has stable IDs across reloads, and so test snapshots are reproducible.
 */
export function makeIdFactory(seed = 0) {
  let counter = seed;
  return function nextId(prefix: string): string {
    counter += 1;
    return `${prefix}_${counter.toString(36).padStart(4, "0")}`;
  };
}

let _runtime = 100_000;
/** Runtime IDs (created during user interaction). Higher counter range so they
    never collide with seeded IDs. */
export function runtimeId(prefix: string): string {
  _runtime += 1;
  return `${prefix}_r${_runtime.toString(36)}`;
}
