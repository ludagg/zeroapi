/**
 * Operation registry — maps each operation `type` to its pure mutator and its
 * danger classification (OPERATIONS.md §2 legend). The `dispatch` switch is
 * exhaustive: adding an Operation variant without handling it is a compile
 * error (the `never` branch).
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { Danger, Operation, OperationType } from "./types";
import { OperationError } from "./types";

import * as meta from "./meta";
import * as resources from "./resources";
import * as fields from "./fields";
import * as relations from "./relations";
import * as auth from "./auth";
import * as roles from "./roles";
import * as permissions from "./permissions";
import * as features from "./features";
import * as authflows from "./authflows";
import * as env from "./env";
import * as custom from "./custom";

/** Apply a single operation's pure mutation (no validation gate here). */
export function dispatch(spec: ZeroAPISpec, op: Operation): ZeroAPISpec {
  switch (op.type) {
    // meta
    case "setApiName": return meta.setApiName(spec, op);
    case "setApiDescription": return meta.setApiDescription(spec, op);
    case "setGlobalRateLimit": return meta.setGlobalRateLimit(spec, op);
    case "clearGlobalRateLimit": return meta.clearGlobalRateLimit(spec, op);
    // resources
    case "addResource": return resources.addResource(spec, op);
    case "removeResource": return resources.removeResource(spec, op);
    case "renameResource": return resources.renameResource(spec, op);
    case "setResourceDescription": return resources.setResourceDescription(spec, op);
    case "setResourceEndpoints": return resources.setResourceEndpoints(spec, op);
    case "setResourceRbac": return resources.setResourceRbac(spec, op);
    case "setSearchableFields": return resources.setSearchableFields(spec, op);
    // fields
    case "addField": return fields.addField(spec, op);
    case "modifyFieldOptions": return fields.modifyFieldOptions(spec, op);
    case "setFieldType": return fields.setFieldType(spec, op);
    case "setFieldRequired": return fields.setFieldRequired(spec, op);
    case "renameField": return fields.renameField(spec, op);
    case "removeField": return fields.removeField(spec, op);
    case "addEnumValue": return fields.addEnumValue(spec, op);
    case "removeEnumValue": return fields.removeEnumValue(spec, op);
    case "setEnumValues": return fields.setEnumValues(spec, op);
    // relations
    case "addRelation": return relations.addRelation(spec, op);
    case "removeRelation": return relations.removeRelation(spec, op);
    case "setRelationOnDelete": return relations.setRelationOnDelete(spec, op);
    case "addResourceRelation": return relations.addResourceRelation(spec, op);
    case "removeResourceRelation": return relations.removeResourceRelation(spec, op);
    // auth
    case "enableJwt": return auth.enableJwt(spec, op);
    case "disableJwt": return auth.disableJwt(spec, op);
    case "enableApiKey": return auth.enableApiKey(spec, op);
    case "disableApiKey": return auth.disableApiKey(spec, op);
    case "addOAuthProvider": return auth.addOAuthProvider(spec, op);
    case "removeOAuthProvider": return auth.removeOAuthProvider(spec, op);
    case "setAuthFlag": return auth.setAuthFlag(spec, op);
    case "disableAuth": return auth.disableAuth(spec, op);
    case "setLegacyAuthStrategy": return auth.setLegacyAuthStrategy(spec, op);
    // roles & permissions
    case "addRole": return roles.addRole(spec, op);
    case "removeRole": return roles.removeRole(spec, op);
    case "renameRole": return roles.renameRole(spec, op);
    case "setPermissionRule": return permissions.setPermissionRule(spec, op);
    case "removePermissionRule": return permissions.removePermissionRule(spec, op);
    case "removeResourcePermissions": return permissions.removeResourcePermissions(spec, op);
    // features
    case "enableFileUpload": return features.enableFileUpload(spec, op);
    case "disableFileUpload": return features.disableFileUpload(spec, op);
    case "addOutboundWebhook": return features.addOutboundWebhook(spec, op);
    case "removeOutboundWebhook": return features.removeOutboundWebhook(spec, op);
    case "addInboundWebhook": return features.addInboundWebhook(spec, op);
    case "removeInboundWebhook": return features.removeInboundWebhook(spec, op);
    case "setSearch": return features.setSearch(spec, op);
    case "setPagination": return features.setPagination(spec, op);
    case "setFeatureRateLimit": return features.setFeatureRateLimit(spec, op);
    // authFlows
    case "setAuthFlow": return authflows.setAuthFlow(spec, op);
    // env
    case "addEnvVar": return env.addEnvVar(spec, op);
    case "modifyEnvVar": return env.modifyEnvVar(spec, op);
    case "removeEnvVar": return env.removeEnvVar(spec, op);
    // custom endpoints
    case "addCustomEndpoint": return custom.addCustomEndpoint(spec, op);
    case "removeCustomEndpoint": return custom.removeCustomEndpoint(spec, op);
    default: {
      const _exhaustive: never = op;
      throw new OperationError(
        `Opération inconnue : "${(_exhaustive as { type?: string }).type ?? "?"}"`,
      );
    }
  }
}

/** Danger classification per operation (OPERATIONS.md §2). */
export const OPERATION_DANGER: Record<OperationType, Danger> = {
  setApiName: "safe",
  setApiDescription: "safe",
  setGlobalRateLimit: "safe",
  clearGlobalRateLimit: "safe",
  addResource: "guarded",
  removeResource: "destructive",
  renameResource: "destructive",
  setResourceDescription: "safe",
  setResourceEndpoints: "guarded",
  setResourceRbac: "guarded",
  setSearchableFields: "guarded",
  addField: "guarded",
  modifyFieldOptions: "guarded",
  setFieldType: "destructive",
  setFieldRequired: "guarded",
  renameField: "destructive",
  removeField: "destructive",
  addEnumValue: "safe",
  removeEnumValue: "destructive",
  setEnumValues: "destructive",
  addRelation: "guarded",
  removeRelation: "guarded",
  setRelationOnDelete: "safe",
  addResourceRelation: "guarded",
  removeResourceRelation: "guarded",
  enableJwt: "guarded",
  disableJwt: "destructive",
  enableApiKey: "safe",
  disableApiKey: "guarded",
  addOAuthProvider: "guarded",
  removeOAuthProvider: "guarded",
  setAuthFlag: "safe",
  disableAuth: "destructive",
  setLegacyAuthStrategy: "guarded",
  addRole: "safe",
  removeRole: "destructive",
  renameRole: "destructive",
  setPermissionRule: "guarded",
  removePermissionRule: "guarded",
  removeResourcePermissions: "guarded",
  enableFileUpload: "guarded",
  disableFileUpload: "guarded",
  addOutboundWebhook: "safe",
  removeOutboundWebhook: "safe",
  addInboundWebhook: "guarded",
  removeInboundWebhook: "safe",
  setSearch: "guarded",
  setPagination: "safe",
  setFeatureRateLimit: "safe",
  setAuthFlow: "guarded",
  addEnvVar: "safe",
  modifyEnvVar: "safe",
  removeEnvVar: "guarded",
  addCustomEndpoint: "guarded",
  removeCustomEndpoint: "guarded",
};

/** Number of operations the engine implements. */
export const OPERATION_COUNT = Object.keys(OPERATION_DANGER).length;
