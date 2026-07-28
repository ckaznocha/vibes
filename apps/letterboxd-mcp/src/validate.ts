const USERNAME_RE = /^[\w-]+$/;

export function assertValidUsername(username: string): void {
  if (!USERNAME_RE.test(username)) {
    throw new Error(`invalid letterboxd username: ${JSON.stringify(username)}`);
  }
}
