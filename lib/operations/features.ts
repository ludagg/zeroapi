/** Feature operations (OPERATIONS.md §2.7). */

import type { FeaturesConfig, ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type {
  AddInboundWebhookOp,
  AddOutboundWebhookOp,
  DisableFileUploadOp,
  EnableFileUploadOp,
  RemoveInboundWebhookOp,
  RemoveOutboundWebhookOp,
  SetFeatureRateLimitOp,
  SetPaginationOp,
  SetSearchOp,
} from "./types";
import { OperationError } from "./types";
import { clone } from "./helpers";

const VALID_STORAGE = ["r2", "s3", "local"] as const;

function featuresOf(spec: ZeroAPISpec): FeaturesConfig {
  return spec.features ?? {};
}

export function enableFileUpload(
  spec: ZeroAPISpec,
  op: EnableFileUploadOp,
): ZeroAPISpec {
  if (!(VALID_STORAGE as readonly string[]).includes(op.provider)) {
    throw new OperationError(
      `provider invalide "${op.provider}" (autorisés : ${VALID_STORAGE.join(", ")})`,
    );
  }
  const next = clone(spec);
  const features = featuresOf(next);
  features.fileUpload = {
    enabled: true,
    provider: op.provider,
    maxSizeMB: op.maxSizeMB ?? 5,
    allowedTypes: op.allowedTypes ? [...op.allowedTypes] : [],
  };
  next.features = features;
  return next;
}

export function disableFileUpload(
  spec: ZeroAPISpec,
  _op: DisableFileUploadOp,
): ZeroAPISpec {
  if (spec.features?.fileUpload === undefined) {
    throw new OperationError("fileUpload n'est pas activé");
  }
  const next = clone(spec);
  delete next.features!.fileUpload;
  return next;
}

export function addOutboundWebhook(
  spec: ZeroAPISpec,
  op: AddOutboundWebhookOp,
): ZeroAPISpec {
  const next = clone(spec);
  const features = featuresOf(next);
  const webhooks = features.webhooks ?? {};
  const outbound = webhooks.outbound ?? [];
  if (!outbound.includes(op.event)) outbound.push(op.event); // idempotent
  webhooks.outbound = outbound;
  features.webhooks = webhooks;
  next.features = features;
  return next;
}

export function removeOutboundWebhook(
  spec: ZeroAPISpec,
  op: RemoveOutboundWebhookOp,
): ZeroAPISpec {
  if (!spec.features?.webhooks?.outbound?.includes(op.event)) {
    throw new OperationError(`Le webhook sortant "${op.event}" n'existe pas`);
  }
  const next = clone(spec);
  const webhooks = next.features!.webhooks!;
  webhooks.outbound = webhooks.outbound!.filter((e) => e !== op.event);
  return next;
}

export function addInboundWebhook(
  spec: ZeroAPISpec,
  op: AddInboundWebhookOp,
): ZeroAPISpec {
  const next = clone(spec);
  const features = featuresOf(next);
  const webhooks = features.webhooks ?? {};
  const inbound = webhooks.inbound ?? [];
  if (!inbound.includes(op.source)) inbound.push(op.source);
  webhooks.inbound = inbound;
  features.webhooks = webhooks;
  next.features = features;
  return next;
}

export function removeInboundWebhook(
  spec: ZeroAPISpec,
  op: RemoveInboundWebhookOp,
): ZeroAPISpec {
  if (!spec.features?.webhooks?.inbound?.includes(op.source)) {
    throw new OperationError(`Le webhook entrant "${op.source}" n'existe pas`);
  }
  const next = clone(spec);
  const webhooks = next.features!.webhooks!;
  webhooks.inbound = webhooks.inbound!.filter((s) => s !== op.source);
  return next;
}

export function setSearch(spec: ZeroAPISpec, op: SetSearchOp): ZeroAPISpec {
  const next = clone(spec);
  const features = featuresOf(next);
  features.search = { enabled: op.enabled };
  if (op.fuzzy !== undefined) features.search.fuzzy = op.fuzzy;
  next.features = features;
  return next;
}

export function setPagination(spec: ZeroAPISpec, op: SetPaginationOp): ZeroAPISpec {
  if (!Number.isFinite(op.defaultLimit) || op.defaultLimit <= 0) {
    throw new OperationError("defaultLimit doit être un nombre positif");
  }
  if (!Number.isFinite(op.maxLimit) || op.maxLimit <= 0) {
    throw new OperationError("maxLimit doit être un nombre positif");
  }
  if (op.defaultLimit > op.maxLimit) {
    throw new OperationError("defaultLimit ne peut pas dépasser maxLimit");
  }
  const next = clone(spec);
  const features = featuresOf(next);
  features.pagination = { defaultLimit: op.defaultLimit, maxLimit: op.maxLimit };
  next.features = features;
  return next;
}

export function setFeatureRateLimit(
  spec: ZeroAPISpec,
  op: SetFeatureRateLimitOp,
): ZeroAPISpec {
  if (op.perKey === undefined && op.public === undefined) {
    throw new OperationError("Fournissez au moins perKey ou public");
  }
  const next = clone(spec);
  const features = featuresOf(next);
  const rateLimit = { ...features.rateLimit };
  if (op.perKey !== undefined) rateLimit.perKey = op.perKey;
  if (op.public !== undefined) rateLimit.public = op.public;
  features.rateLimit = rateLimit;
  next.features = features;
  return next;
}
