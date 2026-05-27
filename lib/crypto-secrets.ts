import { webcrypto } from "node:crypto";

/**
 * AES-256-GCM encryption for `EnvVariable.value`.
 *
 * Stored format (base64) :
 *   [ 12 bytes IV ][ ciphertext ][ 16 bytes auth tag ]
 *
 * Key source: env `SECRETS_ENCRYPTION_KEY` (base64-encoded 32 bytes).
 * If unset, falls back to a key derived from BETTER_AUTH_SECRET (dev only,
 * with a loud warning at decrypt time).
 */
const ALGO = "AES-GCM";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let _key: CryptoKey | null = null;
let _warnedDevKey = false;

async function loadKey(): Promise<CryptoKey> {
  if (_key) return _key;
  const raw = readKeyMaterial();
  _key = await webcrypto.subtle.importKey("raw", raw, ALGO, false, ["encrypt", "decrypt"]);
  return _key;
}

function readKeyMaterial(): Uint8Array {
  const explicit = process.env.SECRETS_ENCRYPTION_KEY;
  if (!explicit && process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY manquante (32 bytes base64 attendus en production).",
    );
  }
  if (explicit) {
    const bytes = Buffer.from(explicit, "base64");
    if (bytes.byteLength !== KEY_BYTES) {
      throw new Error(
        `SECRETS_ENCRYPTION_KEY doit faire ${KEY_BYTES} octets après décodage base64 (reçu ${bytes.byteLength}).`,
      );
    }
    return new Uint8Array(bytes);
  }

  // Dev fallback : on dérive 32 octets stables depuis BETTER_AUTH_SECRET.
  const fallback = process.env.BETTER_AUTH_SECRET;
  if (!fallback) {
    throw new Error(
      "Aucune clé de chiffrement disponible. Définis SECRETS_ENCRYPTION_KEY (32 bytes base64) ou BETTER_AUTH_SECRET.",
    );
  }
  if (!_warnedDevKey && process.env.NODE_ENV === "production") {
    console.warn(
      "[crypto-secrets] SECRETS_ENCRYPTION_KEY absent en production — fallback sur BETTER_AUTH_SECRET. À corriger.",
    );
    _warnedDevKey = true;
  }
  const hash = require("node:crypto").createHash("sha256").update(fallback).digest();
  return new Uint8Array(hash);
}

/**
 * Encrypts a UTF-8 string, returns a base64 blob (IV || ciphertext || tag).
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await loadKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);
  const cipherBuf = await webcrypto.subtle.encrypt({ name: ALGO, iv }, key, data);

  const cipher = new Uint8Array(cipherBuf);
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return Buffer.from(out).toString("base64");
}

/**
 * Decrypts a value produced by `encryptSecret`. Throws if the blob is
 * corrupt or the auth tag does not match (i.e. the key changed).
 */
export async function decryptSecret(blob: string): Promise<string> {
  const key = await loadKey();
  const all = Buffer.from(blob, "base64");
  if (all.byteLength <= IV_BYTES + 16) {
    throw new Error("Blob chiffré invalide.");
  }
  const iv = all.subarray(0, IV_BYTES);
  const cipher = all.subarray(IV_BYTES);
  const plainBuf = await webcrypto.subtle.decrypt(
    { name: ALGO, iv: new Uint8Array(iv) },
    key,
    new Uint8Array(cipher),
  );
  return new TextDecoder().decode(plainBuf);
}

/**
 * Mask a secret value for display — keep the last 4 chars visible.
 */
export function maskSecret(value: string): string {
  if (value.length <= 4) return "•".repeat(8);
  return "•".repeat(Math.min(20, value.length - 4)) + value.slice(-4);
}
