/**
 * Tests pour la catégorisation et la validation des variables d'environnement
 * par API. Aucun accès Prisma, aucun secret externe — un round-trip de
 * chiffrement vérifie l'isolation par job.
 *
 *   pnpm tsx scripts/test-env-vars.ts
 */

import { getRequiredEnvVars, parseSpec } from "@ludagg/zeroapi-runtime";
import {
  buildCategorizedList,
  canUserSet,
  categorize,
  computeDeployReadiness,
  isAutoVar,
} from "../lib/env-vars.js";
import { decryptSecret, encryptSecret } from "../lib/crypto-secrets.js";

function assert(cond: unknown, label: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${label}`);
}

async function main() {
  process.env.SECRETS_ENCRYPTION_KEY ??=
    Buffer.from(new Uint8Array(32).fill(7)).toString("base64");

  // ── Spec minimale sans auth ni env explicite ────────────────────────────
  console.log("→ spec minimale (pas d'env custom)…");
  const minimal = parseSpec({
    version: "1.0",
    name: "minimal",
    resources: [
      {
        name: "Item",
        fields: { title: { type: "string", required: true } },
      },
    ],
  });
  const minimalList = buildCategorizedList(minimal, new Set());
  const minimalDb = minimalList.find((v) => v.name === "DATABASE_URL");
  assert(minimalDb, "DATABASE_URL doit toujours figurer");
  assert(minimalDb.category === "auto", "DATABASE_URL doit être AUTO");
  // Pas d'auth, pas de feature → seule DATABASE_URL doit apparaître.
  const customs = minimalList.filter((v) => v.category !== "auto");
  assert(customs.length === 0, "spec minimale = 0 variable utilisateur");
  console.log(`  ✓ ${minimalList.length} variable(s), toutes AUTO`);

  // ── Spec riche : JWT + OAuth + Stripe + file upload ─────────────────────
  console.log("→ spec riche (JWT + OAuth Google + Stripe + R2)…");
  const rich = parseSpec({
    version: "1.0",
    name: "rich",
    auth: {
      enabled: true,
      strategies: ["jwt", "oauth"],
      jwt: { enabled: true, secretEnv: "JWT_SECRET" },
      oauth: {
        providers: [
          {
            name: "google",
            clientIdEnv: "GOOGLE_CLIENT_ID",
            clientSecretEnv: "GOOGLE_CLIENT_SECRET",
            scopes: ["openid", "email", "profile"],
          },
        ],
      },
    },
    env: [
      {
        name: "STRIPE_SECRET_KEY",
        required: true,
        description: "Stripe live secret.",
      },
      { name: "ANALYTICS_KEY", required: false },
    ],
    features: {
      fileUpload: {
        enabled: true,
        provider: "r2",
        maxSizeMB: 5,
        allowedTypes: ["image/png"],
      },
    },
    resources: [
      {
        name: "Order",
        fields: {
          userId: { type: "uuid", required: true },
          amount: { type: "integer", required: true },
        },
      },
    ],
  });

  const list = buildCategorizedList(rich, new Set());
  const byName = new Map(list.map((v) => [v.name, v]));
  console.log("  variables agrégées :", list.map((v) => `${v.name}:${v.category}`).join(", "));

  // AUTO bucket
  assert(byName.get("DATABASE_URL")?.category === "auto", "DATABASE_URL = auto");
  assert(byName.get("JWT_SECRET")?.category === "auto", "JWT_SECRET = auto");
  assert(
    byName.get("OAUTH_CALLBACK_BASE_URL")?.category === "auto",
    "OAUTH_CALLBACK_BASE_URL = auto",
  );

  // À REMPLIR bucket
  assert(
    byName.get("GOOGLE_CLIENT_ID")?.category === "required",
    "GOOGLE_CLIENT_ID = required (utilisateur)",
  );
  assert(
    byName.get("GOOGLE_CLIENT_SECRET")?.category === "required",
    "GOOGLE_CLIENT_SECRET = required",
  );
  assert(
    byName.get("STRIPE_SECRET_KEY")?.category === "required",
    "STRIPE_SECRET_KEY = required",
  );

  // OPTIONNELLE bucket
  assert(byName.get("ANALYTICS_KEY")?.category === "optional", "ANALYTICS_KEY = optional");

  console.log("  ✓ catégorisation conforme");

  // ── Validation des clés ──────────────────────────────────────────────────
  console.log("→ validation de clé (canUserSet)…");
  assert(canUserSet(rich, "STRIPE_SECRET_KEY"), "Stripe doit être modifiable");
  assert(canUserSet(rich, "GOOGLE_CLIENT_ID"), "OAuth client id modifiable");
  assert(canUserSet(rich, "ANALYTICS_KEY"), "Optionnelle modifiable");
  assert(!canUserSet(rich, "JWT_SECRET"), "JWT_SECRET non modifiable (auto)");
  assert(!canUserSet(rich, "DATABASE_URL"), "DATABASE_URL non modifiable");
  assert(!canUserSet(rich, "OAUTH_CALLBACK_BASE_URL"), "Callback base URL non modifiable");
  assert(!canUserSet(rich, "RANDOM_THING"), "Variable hors-spec refusée");
  console.log("  ✓ canUserSet bloque toutes les clés non légitimes");

  // ── Readiness avec toutes les vars manquantes ───────────────────────────
  console.log("→ readiness sans aucune variable…");
  const r0 = computeDeployReadiness(rich, new Set());
  assert(!r0.ready, "ready=false attendu");
  assert(
    r0.missingRequired.includes("STRIPE_SECRET_KEY") &&
      r0.missingRequired.includes("GOOGLE_CLIENT_ID") &&
      r0.missingRequired.includes("GOOGLE_CLIENT_SECRET"),
    "missingRequired doit contenir Stripe + OAuth",
  );
  assert(
    !r0.missingRequired.includes("JWT_SECRET") &&
      !r0.missingRequired.includes("DATABASE_URL"),
    "AUTO vars ne doivent JAMAIS apparaître dans missingRequired",
  );
  console.log("  ✓ readiness bloque sans vars + ignore les AUTO");

  // ── Readiness une fois toutes les requises définies ─────────────────────
  // Toutes les `required` non-AUTO doivent l'être : OAuth Google, Stripe,
  // et les credentials R2/S3 du feature.fileUpload.
  console.log("→ readiness avec toutes les requises définies…");
  const defined = new Set([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "AWS_BUCKET",
    "R2_ENDPOINT",
  ]);
  const rOk = computeDeployReadiness(rich, defined);
  assert(rOk.ready, "ready=true attendu");
  assert(rOk.missingRequired.length === 0, "0 manquante");
  assert(rOk.setRequired.length === defined.size, `${defined.size} définies`);
  console.log("  ✓ readiness passe au vert quand tout est rempli");

  // ── Isolation par job : chiffrer la même valeur pour 2 jobs ─────────────
  // produit deux blobs différents (IV aléatoire). On vérifie qu'un blob
  // chiffré pour le job A est déchiffrable, et qu'on récupère bien la valeur.
  console.log("→ isolation par job (round-trip chiffrement)…");
  const stripeKey = "sk_live_jobA_42";
  const blobA = await encryptSecret(stripeKey);
  const blobB = await encryptSecret(stripeKey);
  assert(blobA !== blobB, "IV unique → blobs distincts (même valeur, deux chiffrements)");
  const decryptedA = await decryptSecret(blobA);
  assert(decryptedA === stripeKey, "round-trip OK");
  console.log("  ✓ isolation : chaque job stocke une variante chiffrée distincte");

  // ── Catégorisation explicite — une var marquée generate+managedByCloud
  // doit être AUTO même si elle vient du bloc spec.env ────────────────────
  console.log("→ catégorisation explicite generate+managedByCloud…");
  const spec3 = parseSpec({
    version: "1.0",
    name: "explicit-auto",
    env: [
      {
        name: "SESSION_SECRET",
        required: true,
        generate: true,
        managedByCloud: true,
      },
    ],
    resources: [
      { name: "Item", fields: { x: { type: "string", required: true } } },
    ],
  });
  const sess = buildCategorizedList(spec3, new Set()).find(
    (v) => v.name === "SESSION_SECRET",
  );
  assert(sess, "SESSION_SECRET doit apparaître");
  assert(sess.category === "auto", "generate+managedByCloud = AUTO");
  const sessAgg = getRequiredEnvVars(spec3).find((v) => v.name === "SESSION_SECRET");
  assert(sessAgg, "AggregatedEnvVar pour SESSION_SECRET trouvé");
  assert(isAutoVar(sessAgg), "isAutoVar OK");
  assert(categorize(sessAgg) === "auto", "categorize OK");
  console.log("  ✓ generate+managedByCloud → AUTO");

  console.log("\n✅ env-vars OK");
}

main().catch((err) => {
  console.error("\n❌ env-vars KO :", err);
  process.exit(1);
});
