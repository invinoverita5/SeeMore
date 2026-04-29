export function toUsernameKey(username: string): string {
  const usernameKey = username.trim().toLowerCase();

  if (usernameKey.length === 0) {
    throw new TypeError("Chess.com username must not be empty.");
  }

  return usernameKey;
}
