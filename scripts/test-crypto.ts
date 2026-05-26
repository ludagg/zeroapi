/**
 * Smoke test du chiffrement des secrets (AES-256-GCM).
 *   pnpm tsx scripts/test-crypto.ts
 */

import { decryptSecret, encryptSecret, maskSecret } from "../lib/crypto-secrets.js";

async function main() {
  process.env.SECRETS_ENCRYPTION_KEY ??=
    Buffer.from(new Uint8Array(32).fill(7)).toString("base64");

  const plaintext = "sk-prod-9f8e7d6c5b4a3210-very-long-secret-value";

  console.log("→ encrypt…");
  const blob1 = await encryptSecret(plaintext);
  const blob2 = await encryptSecret(plaintext);
  console.log("  ✓ blob:", blob1.slice(0, 36) + "…", `(${blob1.length} chars)`);

  if (blob1 === blob2) throw new Error("IV non aléatoire — vulnérabilité critique");
  console.log("  ✓ IV unique : deux chiffrements donnent deux blobs différents");

  console.log("→ decrypt…");
  const back = await decryptSecret(blob1);
  if (back !== plaintext) throw new Error("Decrypt mismatch");
  console.log("  ✓ round-trip OK");

  console.log("→ tampering test (auth tag)…");
  const tampered = blob1.slice(0, -2) + (blob1.endsWith("A") ? "BB" : "AA");
  try {
    await decryptSecret(tampered);
    throw new Error("Le tampering aurait dû échouer !");
  } catch (err) {
    if ((err as Error).message === "Le tampering aurait dû échouer !") throw err;
    console.log("  ✓ tampering rejeté :", (err as Error).message.slice(0, 50));
  }

  console.log("→ mask :", maskSecret(plaintext));
  console.log("\n✅ Crypto OK");
}

main().catch((err) => {
  console.error("\n❌ Crypto KO :", err);
  process.exit(1);
});
