export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

export function createTtlCache<T>(options: {
  nowImpl?: () => number;
  ttlSec: number;
}): TtlCache<T> {
  const { nowImpl = () => Date.now(), ttlSec } = options;
  let entry: null | { expiresAt: number; key: string; value: T } = null;

  return {
    get(key: string): T | undefined {
      if (entry?.key === key && entry.expiresAt > nowImpl()) {
        return entry.value;
      }
      return undefined;
    },
    set(key: string, value: T): void {
      entry = { expiresAt: nowImpl() + ttlSec * 1000, key, value };
    },
  };
}
