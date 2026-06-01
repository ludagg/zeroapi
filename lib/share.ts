import { randomBytes } from "node:crypto";

/** A URL-safe, hard-to-guess token for public read-only share links. */
export function generateShareSlug(): string {
  return randomBytes(12).toString("base64url");
}
