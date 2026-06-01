/**
 * Architecture audit (pure) — turns a ZeroAPISpec into actionable findings.
 *
 * Each finding may carry a one-click `fix` = a single validated operation
 * (applied through the same engine as the graph editor, so it's undoable and
 * reflected live). This is what makes the right panel a real "architect".
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { detectAuthFeatures } from "@/lib/conversation-helpers";

export type AuditSeverity = "error" | "warning" | "info";
export type AuditCategory = "security" | "scalability" | "integrity" | "conventions";

export type AuditFix = {
  label: string;
  op: { type: string; params: Record<string, unknown> };
  /** Send `confirmed: true` (destructive ops the user explicitly accepts via the fix). */
  confirmed?: boolean;
};

export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  category: AuditCategory;
  title: string;
  detail: string;
  target?: string;
  fix?: AuditFix;
};

const DEFAULT_ENDPOINTS = ["list", "create", "read", "update", "delete"];
const OWNER_FIELDS = ["userid", "ownerid"];

/** Run every audit rule over the spec. Empty array = healthy. */
export function auditSpec(spec: ZeroAPISpec | null | undefined): AuditFinding[] {
  const out: AuditFinding[] = [];
  if (!spec || !Array.isArray(spec.resources) || spec.resources.length === 0) return out;

  const jwt = detectAuthFeatures(spec).includes("JWT");
  const oauthOn = (spec.auth?.oauth?.providers?.length ?? 0) > 0;
  const permissions = spec.permissions ?? [];
  const hasAnyPermission = permissions.length > 0;
  const roleNames = new Set((spec.roles ?? []).map((r) => r.name));
  const ownByResource = new Set(
    permissions.filter((p) => p.rules.some((r) => r.ownOnly === true)).map((p) => p.resource),
  );
  const anyOwnOrScope = permissions.some((p) =>
    p.rules.some((r) => r.ownOnly === true || r.scope != null),
  );

  // ── Sécurité ───────────────────────────────────────────────────────────────
  if (oauthOn && !jwt) {
    out.push({
      id: "sec-oauth-no-jwt",
      severity: "error",
      category: "security",
      title: "OAuth configuré sans JWT",
      detail: "OAuth émet des JWT — le système JWT doit être activé, sinon la génération échoue.",
      fix: { label: "Activer JWT", op: { type: "enableJwt", params: {} } },
    });
  }
  if (anyOwnOrScope && !jwt) {
    out.push({
      id: "sec-ownonly-no-jwt",
      severity: "error",
      category: "security",
      title: "Permissions ownOnly/scope sans JWT",
      detail: "L'isolation par utilisateur (ownOnly) ou multi-tenant (scope) exige le système JWT.",
      fix: { label: "Activer JWT", op: { type: "enableJwt", params: {} } },
    });
  }
  if (jwt && !hasAnyPermission) {
    out.push({
      id: "sec-no-permissions",
      severity: "warning",
      category: "security",
      title: "Aucune permission déclarée",
      detail: "JWT est actif mais aucune règle RBAC n'est définie : tout est accessible. Ajoute des rôles et des permissions.",
    });
  }

  // ── Par ressource ──────────────────────────────────────────────────────────
  for (const r of spec.resources) {
    const fieldEntries = Object.entries(r.fields ?? {});
    const endpoints = (r.endpoints as string[] | undefined) ?? DEFAULT_ENDPOINTS;

    // Ownership: a userId/ownerId field but no ownOnly rule (JWT on).
    const ownerField = fieldEntries.find(([name]) => OWNER_FIELDS.includes(name.toLowerCase()));
    if (jwt && ownerField && !ownByResource.has(r.name)) {
      out.push({
        id: `sec-no-ownonly-${r.name}`,
        severity: "warning",
        category: "security",
        title: `${r.name} sans isolation utilisateur`,
        detail: `${r.name} a un champ \`${ownerField[0]}\` mais aucune règle ownOnly : un utilisateur pourrait voir les lignes des autres.`,
        target: r.name,
        fix: roleNames.has("user")
          ? {
              label: "Restreindre au propriétaire",
              op: {
                type: "setPermissionRule",
                params: { resource: r.name, role: "user", actions: ["create", "read", "update", "delete"], ownOnly: true },
              },
            }
          : undefined,
      });
    }

    // File fields without the upload feature enabled.
    const hasFileField = fieldEntries.some(([, def]) => def.type === "file" || def.type === "file[]");
    if (hasFileField && !spec.features?.fileUpload?.enabled) {
      out.push({
        id: `sec-file-no-upload-${r.name}`,
        severity: "warning",
        category: "security",
        title: `${r.name} : upload de fichiers non configuré`,
        detail: `${r.name} a un champ fichier mais la fonctionnalité d'upload (provider, limites de taille/type) n'est pas activée.`,
        target: r.name,
        fix: { label: "Activer l'upload", op: { type: "enableFileUpload", params: { provider: "local" } } },
      });
    }

    // FK field declared on a relation but missing on the resource.
    for (const rel of r.relations ?? []) {
      if (rel.field && !(r.fields ?? {})[rel.field]) {
        out.push({
          id: `int-missing-fk-${r.name}-${rel.field}`,
          severity: "warning",
          category: "integrity",
          title: `Clé étrangère manquante sur ${r.name}`,
          detail: `La relation vers ${rel.resource} référence le champ \`${rel.field}\` qui n'existe pas sur ${r.name}.`,
          target: r.name,
          fix: {
            label: `Ajouter ${rel.field}`,
            op: { type: "addField", params: { resource: r.name, field: rel.field, fieldType: "uuid" } },
          },
        });
      }
      if (rel.type === "manyToMany" && !rel.through) {
        out.push({
          id: `int-n2n-no-through-${r.name}-${rel.resource}`,
          severity: "error",
          category: "integrity",
          title: `Relation N-N sans table de jonction`,
          detail: `${r.name} ↔ ${rel.resource} (many-to-many) exige une table de jonction \`through\`.`,
          target: r.name,
        });
      }
    }

    // Enum fields without values.
    for (const [name, def] of fieldEntries) {
      if (def.type === "enum" && !(def.values && def.values.length > 0)) {
        out.push({
          id: `int-enum-no-values-${r.name}-${name}`,
          severity: "error",
          category: "integrity",
          title: `Enum sans valeurs`,
          detail: `Le champ \`${r.name}.${name}\` est un enum mais n'a aucune valeur définie.`,
          target: r.name,
        });
      }
    }

    // State machine on a non-enum field.
    if (r.stateMachine) {
      const f = (r.fields ?? {})[r.stateMachine.field];
      if (!f || f.type !== "enum") {
        out.push({
          id: `int-sm-not-enum-${r.name}`,
          severity: "error",
          category: "integrity",
          title: `Workflow sur un champ non-enum`,
          detail: `Le state machine de ${r.name} cible \`${r.stateMachine.field}\`, qui doit être un champ enum.`,
          target: r.name,
        });
      }
    }

    // Conventions: PascalCase resource name.
    if (!/^[A-Z][A-Za-z0-9]*$/.test(r.name)) {
      const newName = r.name.replace(/[^A-Za-z0-9]/g, "");
      const pascal = newName ? newName.charAt(0).toUpperCase() + newName.slice(1) : "";
      out.push({
        id: `conv-pascal-${r.name}`,
        severity: "info",
        category: "conventions",
        title: `Nom de ressource non conforme`,
        detail: `${r.name} devrait être en PascalCase singulier (ex. ${pascal || "Product"}).`,
        target: r.name,
        fix:
          pascal && pascal !== r.name
            ? {
                label: `Renommer en ${pascal}`,
                op: { type: "renameResource", params: { oldName: r.name, newName: pascal } },
                confirmed: true,
              }
            : undefined,
      });
    }
  }

  // ── Scalabilité ────────────────────────────────────────────────────────────
  const hasListEndpoint = spec.resources.some((r) =>
    ((r.endpoints as string[] | undefined) ?? DEFAULT_ENDPOINTS).includes("list"),
  );
  if (hasListEndpoint && !spec.features?.pagination) {
    out.push({
      id: "scale-no-pagination",
      severity: "warning",
      category: "scalability",
      title: "Pagination non configurée",
      detail: "Des endpoints `list` existent sans pagination : les réponses peuvent renvoyer toute la table.",
      fix: {
        label: "Activer la pagination",
        op: { type: "setPagination", params: { defaultLimit: 20, maxLimit: 100 } },
      },
    });
  }
  const hasSearchable = spec.resources.some((r) => (r.searchable?.length ?? 0) > 0);
  if (hasSearchable && !spec.features?.search?.enabled) {
    out.push({
      id: "scale-search-off",
      severity: "warning",
      category: "scalability",
      title: "Recherche désactivée",
      detail: "Des champs sont marqués `searchable` mais la fonctionnalité de recherche est désactivée.",
      fix: { label: "Activer la recherche", op: { type: "setSearch", params: { enabled: true } } },
    });
  }

  // ── Conventions (niveau API) ───────────────────────────────────────────────
  if (!spec.description || !spec.description.trim()) {
    out.push({
      id: "conv-no-description",
      severity: "info",
      category: "conventions",
      title: "API sans description",
      detail: "Ajoute une description courte de l'API (utile pour la doc OpenAPI).",
    });
  }

  return out;
}

const WEIGHT: Record<AuditSeverity, number> = { error: 15, warning: 7, info: 2 };

/** 0–100 architecture score derived from the findings. */
export function auditScore(findings: AuditFinding[]): number {
  const penalty = findings.reduce((sum, f) => sum + WEIGHT[f.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}
