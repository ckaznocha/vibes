export function parseCacheTtlSec(
  value: string | undefined,
  fallback = 300,
): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}
