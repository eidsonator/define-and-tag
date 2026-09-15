const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function usernameError(value: string) {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    return "Use 3–32 lowercase letters, numbers, underscores, or hyphens.";
  }
  return undefined;
}
