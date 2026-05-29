/** Auth operations (OPERATIONS.md §2.5 + §3.5, §3.6). */

import type {
  GlobalAuthConfig,
  OAuthProviderConfig,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type {
  AddOAuthProviderOp,
  DisableApiKeyOp,
  DisableAuthOp,
  DisableJwtOp,
  EnableApiKeyOp,
  EnableJwtOp,
  RemoveOAuthProviderOp,
  SetAuthFlagOp,
  SetLegacyAuthStrategyOp,
} from "./types";
import { ConfirmationRequiredError, OperationError } from "./types";
import { clone } from "./helpers";

const VALID_OAUTH = ["google", "github", "apple"] as const;

function authOf(spec: ZeroAPISpec): GlobalAuthConfig {
  return (spec.auth ?? {}) as GlobalAuthConfig;
}

function addStrategy(auth: GlobalAuthConfig, strategy: "jwt" | "apikey" | "oauth"): void {
  const list = new Set(auth.strategies ?? []);
  list.add(strategy);
  auth.strategies = [...list];
}

function removeStrategy(auth: GlobalAuthConfig, strategy: "jwt" | "apikey" | "oauth"): void {
  if (auth.strategies) {
    auth.strategies = auth.strategies.filter((s) => s !== strategy);
    if (auth.strategies.length === 0) delete auth.strategies;
  }
}

/** Drop the auth block entirely when nothing meaningful is left. */
function pruneAuth(spec: ZeroAPISpec): void {
  const a = spec.auth as GlobalAuthConfig | undefined;
  if (!a) return;
  const hasContent =
    a.jwt !== undefined ||
    a.apikey !== undefined ||
    a.oauth !== undefined ||
    typeof a.strategy === "string" ||
    (a.strategies?.length ?? 0) > 0;
  if (!hasContent) delete spec.auth;
}

export function enableJwt(spec: ZeroAPISpec, op: EnableJwtOp): ZeroAPISpec {
  const conflict = spec.resources.find(
    (r) => r.name === "User" || r.name === "RefreshToken",
  );
  if (conflict) {
    throw new OperationError(
      `Activer JWT réserve "User"/"RefreshToken" — renommez d'abord la ressource "${conflict.name}"`,
    );
  }
  const next = clone(spec);
  const auth = authOf(next);
  auth.enabled = true;
  auth.jwt = { ...auth.jwt, enabled: true };
  if (op.secretEnv) auth.jwt.secretEnv = op.secretEnv;
  if (op.accessTokenTTL) auth.jwt.accessTokenTTL = op.accessTokenTTL;
  if (op.refreshTokenTTL) auth.jwt.refreshTokenTTL = op.refreshTokenTTL;
  addStrategy(auth, "jwt");
  next.auth = auth;
  return next;
}

/** Things that depend on JWT and would break if it were removed (§3.5). */
function jwtDependents(spec: ZeroAPISpec): string[] {
  const out: string[] = [];
  const auth = authOf(spec);
  if ((auth.oauth?.providers?.length ?? 0) > 0) {
    out.push(`${auth.oauth!.providers.length} provider(s) OAuth (exigent JWT)`);
  }
  for (const perm of spec.permissions ?? []) {
    for (const rule of perm.rules) {
      if (rule.ownOnly) out.push(`règle ownOnly sur ${perm.resource} (rôle ${rule.role})`);
    }
  }
  const userTargets = new Set(["User", "RefreshToken"]);
  for (const rel of spec.relations ?? []) {
    if (userTargets.has(rel.to)) out.push(`relation top-level ${rel.from} → ${rel.to}`);
  }
  for (const r of spec.resources) {
    for (const rel of r.relations ?? []) {
      if (userTargets.has(rel.resource)) out.push(`relation ${r.name} → ${rel.resource}`);
    }
  }
  return out;
}

/** Remove everything that requires JWT so the resulting spec stays valid. */
function cascadeRemoveJwtDependents(spec: ZeroAPISpec): void {
  const userTargets = new Set(["User", "RefreshToken", "OAuthAccount"]);
  if (spec.relations) {
    spec.relations = spec.relations.filter((rel) => !userTargets.has(rel.to));
    if (spec.relations.length === 0) delete spec.relations;
  }
  for (const r of spec.resources) {
    if (r.relations) {
      r.relations = r.relations.filter((rel) => !userTargets.has(rel.resource));
      if (r.relations.length === 0) delete r.relations;
    }
  }
  if (spec.permissions) {
    for (const perm of spec.permissions) {
      perm.rules = perm.rules.filter((rule) => !rule.ownOnly);
    }
    spec.permissions = spec.permissions.filter((p) => p.rules.length > 0);
    if (spec.permissions.length === 0) delete spec.permissions;
  }
}

export function disableJwt(spec: ZeroAPISpec, op: DisableJwtOp): ZeroAPISpec {
  const auth = authOf(spec);
  if (auth.jwt?.enabled !== true && auth.strategy !== "jwt") {
    throw new OperationError("JWT n'est pas activé");
  }
  const deps = jwtDependents(spec);
  if (deps.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "disableJwt",
      `Désactiver JWT casserait ${deps.length} dépendance(s). Confirmez pour les retirer en cascade.`,
      deps,
    );
  }
  const next = clone(spec);
  cascadeRemoveJwtDependents(next);
  const a = authOf(next);
  delete a.jwt;
  if (a.strategy === "jwt") delete a.strategy;
  delete a.oauth; // OAuth requires JWT
  removeStrategy(a, "jwt");
  removeStrategy(a, "oauth");
  next.auth = a;
  pruneAuth(next);
  return next;
}

export function enableApiKey(spec: ZeroAPISpec, op: EnableApiKeyOp): ZeroAPISpec {
  const next = clone(spec);
  const auth = authOf(next);
  auth.enabled = true;
  auth.apikey = { ...auth.apikey, enabled: true };
  if (op.header) auth.apikey.header = op.header;
  if (op.prefix) auth.apikey.prefix = op.prefix;
  addStrategy(auth, "apikey");
  next.auth = auth;
  return next;
}

export function disableApiKey(spec: ZeroAPISpec, _op: DisableApiKeyOp): ZeroAPISpec {
  const auth = authOf(spec);
  if (auth.apikey === undefined) {
    throw new OperationError("API key n'est pas activé");
  }
  const next = clone(spec);
  const a = authOf(next);
  delete a.apikey;
  removeStrategy(a, "apikey");
  next.auth = a;
  pruneAuth(next);
  return next;
}

export function addOAuthProvider(
  spec: ZeroAPISpec,
  op: AddOAuthProviderOp,
): ZeroAPISpec {
  if (!(VALID_OAUTH as readonly string[]).includes(op.provider)) {
    throw new OperationError(
      `Provider OAuth invalide "${op.provider}" (autorisés : ${VALID_OAUTH.join(", ")})`,
    );
  }
  const auth = authOf(spec);
  if (auth.jwt?.enabled !== true) {
    throw new OperationError(
      `OAuth exige auth.jwt.enabled = true — activez JWT d'abord (enableJwt)`,
    );
  }
  if ((auth.oauth?.providers ?? []).some((p) => p.name === op.provider)) {
    throw new OperationError(`Le provider OAuth "${op.provider}" est déjà configuré`);
  }
  const upper = op.provider.toUpperCase();
  const provider: OAuthProviderConfig = {
    name: op.provider,
    clientIdEnv: op.clientIdEnv ?? `${upper}_CLIENT_ID`,
    clientSecretEnv: op.clientSecretEnv ?? `${upper}_CLIENT_SECRET`,
  };
  if (op.scopes) provider.scopes = [...op.scopes];

  const next = clone(spec);
  const a = authOf(next);
  a.oauth = { providers: [...(a.oauth?.providers ?? []), provider] };
  addStrategy(a, "oauth");
  next.auth = a;
  return next;
}

export function removeOAuthProvider(
  spec: ZeroAPISpec,
  op: RemoveOAuthProviderOp,
): ZeroAPISpec {
  const auth = authOf(spec);
  const providers = auth.oauth?.providers ?? [];
  if (!providers.some((p) => p.name === op.provider)) {
    throw new OperationError(`Le provider OAuth "${op.provider}" n'est pas configuré`);
  }
  const next = clone(spec);
  const a = authOf(next);
  const remaining = (a.oauth?.providers ?? []).filter((p) => p.name !== op.provider);
  if (remaining.length > 0) {
    a.oauth = { providers: remaining };
  } else {
    delete a.oauth;
    removeStrategy(a, "oauth");
  }
  next.auth = a;
  return next;
}

export function setAuthFlag(spec: ZeroAPISpec, op: SetAuthFlagOp): ZeroAPISpec {
  if (op.flag !== "emailVerification" && op.flag !== "passwordReset") {
    throw new OperationError(
      `flag invalide "${op.flag}" (autorisés : emailVerification, passwordReset)`,
    );
  }
  if (spec.auth === undefined) {
    throw new OperationError(`Aucun bloc auth — activez une stratégie d'abord`);
  }
  const next = clone(spec);
  const a = authOf(next);
  a[op.flag] = op.value;
  next.auth = a;
  return next;
}

export function disableAuth(spec: ZeroAPISpec, op: DisableAuthOp): ZeroAPISpec {
  if (spec.auth === undefined) {
    throw new OperationError("Aucun bloc auth à désactiver");
  }
  const deps = jwtDependents(spec);
  if (deps.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "disableAuth",
      `Désactiver l'auth casserait ${deps.length} dépendance(s). Confirmez pour les retirer en cascade.`,
      deps,
    );
  }
  const next = clone(spec);
  cascadeRemoveJwtDependents(next);
  delete next.auth;
  return next;
}

export function setLegacyAuthStrategy(
  spec: ZeroAPISpec,
  op: SetLegacyAuthStrategyOp,
): ZeroAPISpec {
  if (!["jwt", "apikey", "bearer"].includes(op.strategy)) {
    throw new OperationError(
      `strategy invalide "${op.strategy}" (autorisés : jwt, apikey, bearer)`,
    );
  }
  if (op.strategy === "jwt") {
    const conflict = spec.resources.find(
      (r) => r.name === "User" || r.name === "RefreshToken",
    );
    if (conflict) {
      throw new OperationError(
        `La stratégie jwt réserve "User"/"RefreshToken" — renommez d'abord "${conflict.name}"`,
      );
    }
  }
  const next = clone(spec);
  next.auth = { strategy: op.strategy } as GlobalAuthConfig;
  return next;
}
