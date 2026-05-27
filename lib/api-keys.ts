import { webcrypto } from "node:crypto";

const KEY_PREFIX = "zapi_";

/**
 * Generates a fresh personal API key.
 *
 * Format : `zapi_<32 url-safe base64 chars>`. Only the SHA-256 hash is stored
 * in the database; the plaintext is shown to the user once at creation.
 */
export function generateApiKey(): { plaintext: string; prefix: string } {
  const bytes = webcrypto.getRandomValues(new Uint8Array(24));
  const b64 = Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const plaintext = `${KEY_PREFIX}${b64}`;
  return { plaintext, prefix: plaintext.slice(0, KEY_PREFIX.length + 4) };
}

export async function hashApiKey(plaintext: string): Promise<string> {
  const data = new TextEncoder().encode(plaintext);
  const buf = await webcrypto.subtle.digest("SHA-256", data);
  return Buffer.from(new Uint8Array(buf)).toString("hex");
}

export function maskKey(prefix: string): string {
  return `${prefix}••••••••••••`;
}
