/**
 * Smoke test for the env-var categorisation helper.
 *   pnpm tsx scripts/test-env-vars.ts
 */
import { parseSpec } from "@ludagg/zeroapi-runtime";
import {
  categorizeEnvVar,
  listSpecEnvVars,
  missingRequiredEnvVars,
} from "../lib/env-vars";

function eq<T>(label: string, actual: T, expected: T) {
  const ok =
    JSON.stringify(actual, Object.keys(actual ?? {}).sort()) ===
    JSON.stringify(expected, Object.keys(expected ?? {}).sort());
  if (!ok) {
    console.error(`✗ ${label}\n  actual:   ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}`);
}

async function main() {
  const raw = {
    version: "1.0",
    name: "demo",
    description: "demo",
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
            scopes: ["openid", "email"],
          },
        ],
      },
    },
    env: [
      { name: "STRIPE_KEY", required: true, description: "Stripe API key" },
      { name: "SENTRY_DSN", required: false, description: "Sentry DSN" },
    ],
    resources: [
      {
        name: "Item",
        fields: { title: { type: "string", required: true } },
      },
    ],
  };

  const spec = parseSpec(raw);

  console.log("→ listSpecEnvVars");
  const vars = listSpecEnvVars(spec);
  const byName = Object.fromEntries(vars.map((v) => [v.name, v]));

  eq("DATABASE_URL = auto",              byName["DATABASE_URL"]?.category, "auto");
  eq("JWT_SECRET = auto",                byName["JWT_SECRET"]?.category, "auto");
  eq("OAUTH_CALLBACK_BASE_URL = auto",   byName["OAUTH_CALLBACK_BASE_URL"]?.category, "auto");
  eq("GOOGLE_CLIENT_ID = required",      byName["GOOGLE_CLIENT_ID"]?.category, "required");
  eq("GOOGLE_CLIENT_SECRET = required",  byName["GOOGLE_CLIENT_SECRET"]?.category, "required");
  eq("STRIPE_KEY = required",            byName["STRIPE_KEY"]?.category, "required");
  eq("SENTRY_DSN = optional",            byName["SENTRY_DSN"]?.category, "optional");

  console.log("→ categorizeEnvVar standalone");
  eq(
    "OAUTH_CALLBACK_BASE_URL ad hoc",
    categorizeEnvVar({ name: "OAUTH_CALLBACK_BASE_URL", required: true, source: "auth.oauth", managedByCloud: true }),
    "auto",
  );

  console.log("→ missingRequiredEnvVars");
  eq(
    "rien défini → toutes les requises manquent",
    missingRequiredEnvVars(spec, []).sort(),
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "STRIPE_KEY"].sort(),
  );
  eq(
    "Google défini → reste STRIPE_KEY",
    missingRequiredEnvVars(spec, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]),
    ["STRIPE_KEY"],
  );
  eq(
    "tout défini → []",
    missingRequiredEnvVars(spec, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "STRIPE_KEY"]),
    [],
  );

  console.log("\n✅ env-vars OK");
}

main().catch((err) => {
  console.error("\n❌ env-vars KO:", err);
  process.exit(1);
});
