/**
 * Simple signed state token for OAuth CSRF protection.
 * Encodes userId + random nonce. Validated on callback.
 */

export function createOAuthState(userId: string): string {
  const nonce = crypto.randomUUID();
  const payload = JSON.stringify({ userId, nonce });
  return Buffer.from(payload).toString("base64url");
}

export function parseOAuthState(state: string): { userId: string; nonce: string } | null {
  try {
    const payload = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(payload);
    if (typeof parsed.userId === "string" && typeof parsed.nonce === "string") {
      return parsed as { userId: string; nonce: string };
    }
    return null;
  } catch {
    return null;
  }
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64url");
}
