/**
 * Treat an env var set to an empty or whitespace-only string as unset.
 *
 * `process.env.FOO` is `""` when a var is exported with no value — common in shell
 * wrappers and container env files — and `""` is neither `undefined` nor nullish, so it
 * survives both `?? fallback` and `!== undefined` guards and silently overrides the
 * intended default with a useless value.
 */
export function optionalEnvironment(
  raw: string | undefined,
): string | undefined {
  const trimmed = raw?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}
