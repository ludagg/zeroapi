/**
 * Human-readable French phrases for the operations Kia applies.
 *
 * Pure + isomorphic (no server deps): used by the agent route to persist a
 * readable assistant summary, and by the chat UI to render operation chips
 * live. Never shows raw JSON to the user.
 */

import type { OperationType } from "../operations/types";

type Params = Record<string, unknown>;

function s(v: unknown): string {
  return v == null ? "" : String(v);
}

/** A short French sentence describing an applied operation (no leading icon). */
export function describeOperation(type: OperationType, params: Params): string {
  const p = params;
  switch (type) {
    // meta
    case "setApiName": return `Renommé l'API en « ${s(p.name)} »`;
    case "setApiDescription": return `Mis à jour la description de l'API`;
    case "setGlobalRateLimit": return `Défini un rate limit global (${s(p.max)} req / ${s(p.windowMs)} ms)`;
    case "clearGlobalRateLimit": return `Retiré le rate limit global`;
    // resources
    case "addResource": return `Ajouté la ressource ${s(p.name)}`;
    case "removeResource": return `Supprimé la ressource ${s(p.name)}`;
    case "renameResource": return `Renommé la ressource ${s(p.oldName)} → ${s(p.newName)}`;
    case "setResourceDescription": return `Mis à jour la description de ${s(p.name)}`;
    case "setResourceEndpoints": return `Redéfini les endpoints de ${s(p.name)}`;
    case "setResourceRbac": return `Mis à jour le RBAC de ${s(p.name)}`;
    case "setSearchableFields": return `Défini les champs recherchables de ${s(p.name)}`;
    // fields
    case "addField": return `Ajouté le champ ${s(p.field)} à ${s(p.resource)}`;
    case "modifyFieldOptions": return `Modifié les options du champ ${s(p.field)} (${s(p.resource)})`;
    case "setFieldType": return `Changé le type du champ ${s(p.field)} en ${s(p.fieldType)} (${s(p.resource)})`;
    case "setFieldRequired": return `${p.required ? "Rendu obligatoire" : "Rendu optionnel"} le champ ${s(p.field)} (${s(p.resource)})`;
    case "renameField": return `Renommé le champ ${s(p.oldName)} → ${s(p.newName)} (${s(p.resource)})`;
    case "removeField": return `Supprimé le champ ${s(p.field)} de ${s(p.resource)}`;
    case "addEnumValue": return `Ajouté la valeur « ${s(p.value)} » à l'enum ${s(p.field)} (${s(p.resource)})`;
    case "removeEnumValue": return `Retiré la valeur « ${s(p.value)} » de l'enum ${s(p.field)} (${s(p.resource)})`;
    case "setEnumValues": return `Redéfini les valeurs de l'enum ${s(p.field)} (${s(p.resource)})`;
    // relations
    case "addRelation": return `Ajouté une relation ${s(p.from)} → ${s(p.to)} (${s(p.relationType)})`;
    case "removeRelation": return `Retiré la relation ${s(p.from)} → ${s(p.to)}`;
    case "setRelationOnDelete": return `Défini onDelete=${s(p.onDelete)} pour ${s(p.from)} → ${s(p.to)}`;
    case "addResourceRelation": return `Ajouté une relation ${s(p.resource)} → ${s(p.target)} (${s(p.relationType)})`;
    case "removeResourceRelation": return `Retiré la relation ${s(p.resource)} → ${s(p.target)}`;
    // auth
    case "enableJwt": return `Activé l'authentification JWT`;
    case "disableJwt": return `Désactivé l'authentification JWT`;
    case "enableApiKey": return `Activé l'authentification par clé d'API`;
    case "disableApiKey": return `Désactivé l'authentification par clé d'API`;
    case "addOAuthProvider": return `Ajouté le fournisseur OAuth ${s(p.provider)}`;
    case "removeOAuthProvider": return `Retiré le fournisseur OAuth ${s(p.provider)}`;
    case "setAuthFlag": return `${p.value ? "Activé" : "Désactivé"} ${s(p.flag)}`;
    case "disableAuth": return `Désactivé toute l'authentification`;
    case "setLegacyAuthStrategy": return `Défini la stratégie d'auth ${s(p.strategy)}`;
    // roles & permissions
    case "addRole": return `Ajouté le rôle ${s(p.name)}`;
    case "removeRole": return `Supprimé le rôle ${s(p.name)}`;
    case "renameRole": return `Renommé le rôle ${s(p.oldName)} → ${s(p.newName)}`;
    case "setPermissionRule": return `Défini les permissions de ${s(p.role)} sur ${s(p.resource)}`;
    case "removePermissionRule": return `Retiré les permissions de ${s(p.role)} sur ${s(p.resource)}`;
    case "removeResourcePermissions": return `Retiré le bloc de permissions de ${s(p.resource)}`;
    case "setPermissionScope": return `Activé le multi-tenant sur ${s(p.resource)} (${s(p.role)} · ${s(p.column)})`;
    case "removePermissionScope": return `Retiré le multi-tenant de ${s(p.resource)} (${s(p.role)})`;
    // features
    case "enableFileUpload": return `Activé l'upload de fichiers (${s(p.provider)})`;
    case "disableFileUpload": return `Désactivé l'upload de fichiers`;
    case "addOutboundWebhook": return `Ajouté le webhook sortant « ${s(p.event)} »`;
    case "removeOutboundWebhook": return `Retiré le webhook sortant « ${s(p.event)} »`;
    case "addInboundWebhook": return `Ajouté le webhook entrant « ${s(p.source)} »`;
    case "removeInboundWebhook": return `Retiré le webhook entrant « ${s(p.source)} »`;
    case "setSearch": return `${p.enabled ? "Activé" : "Désactivé"} la recherche`;
    case "setPagination": return `Configuré la pagination (défaut ${s(p.defaultLimit)}, max ${s(p.maxLimit)})`;
    case "setFeatureRateLimit": return `Configuré les rate limits par feature`;
    // authFlows
    case "setAuthFlow": return `${p.value ? "Activé" : "Désactivé"} le flow ${s(p.flow)}`;
    // env
    case "addEnvVar": return `Ajouté la variable d'environnement ${s(p.name)}`;
    case "modifyEnvVar": return `Modifié la variable d'environnement ${s(p.name)}`;
    case "removeEnvVar": return `Retiré la variable d'environnement ${s(p.name)}`;
    // custom endpoints
    case "addCustomEndpoint": return `Ajouté un endpoint custom sur ${s(p.resource)}`;
    case "removeCustomEndpoint": return `Retiré un endpoint custom de ${s(p.resource)}`;
    // state machine
    case "setStateMachine": return `Ajouté un workflow d'états sur ${s(p.resource)}.${s(p.field)}`;
    case "addStateTransition": return `Ajouté la transition ${s(p.from)} → ${s(p.to)} (${s(p.resource)})`;
    case "removeStateTransition": return `Retiré la transition ${s(p.from)} → ${s(p.to)} (${s(p.resource)})`;
    case "removeStateMachine": return `Retiré le workflow d'états de ${s(p.resource)}`;
    // aggregates
    case "addAggregate": return `Ajouté l'agrégat ${s(p.name)} sur ${s(p.resource)}`;
    case "removeAggregate": return `Retiré l'agrégat ${s(p.name)} de ${s(p.resource)}`;
    // resource flags / transactions
    case "setSoftDelete": return `${p.enabled ? "Activé" : "Désactivé"} le soft-delete sur ${s(p.resource)}`;
    case "setTimestamps": return `${p.enabled ? "Activé" : "Désactivé"} les timestamps sur ${s(p.resource)}`;
    case "setTransactions": return `Configuré les transactions de ${s(p.resource)}`;
    default: {
      const _exhaustive: never = type;
      return `Appliqué ${String(_exhaustive)}`;
    }
  }
}

/** Markdown bullet summary of the applied operations (for persisted messages). */
export function summarizeAppliedOperations(
  ops: Array<{ type: OperationType; params: Record<string, unknown>; outcome: string }>,
): string {
  const applied = ops.filter((o) => o.outcome === "applied");
  if (applied.length === 0) return "Aucune modification appliquée.";
  // Markdown bullet list so it renders cleanly on reload (one item per line).
  const lines = applied.map((o) => `- ✓ ${describeOperation(o.type, o.params)}`);
  return lines.join("\n");
}
