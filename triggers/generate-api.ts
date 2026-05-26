/**
 * Job Trigger.dev — déclenché par l'événement "api.generate".
 *
 * Le SDK Trigger.dev n'est volontairement pas installé : ce fichier décrit
 * la forme attendue du job et est repris tel quel quand on branche v3.
 *
 * En attendant, `lib/jobs.ts#triggerGenerateJob` :
 *   - envoie l'event à Trigger.dev si TRIGGER_API_KEY est défini
 *   - sinon délègue à `workers/runtime-worker.ts#runGenerationWorker` en local.
 */

import type { ZeroAPISpec } from "@/lib/spec";

export type GenerateApiPayload = {
  jobId: string;
  spec: ZeroAPISpec;
};

export const GENERATE_API_JOB = {
  id: "generate-api",
  name: "Generate API from Spec",
  version: "1.0.0",
  event: "api.generate",
} as const;
