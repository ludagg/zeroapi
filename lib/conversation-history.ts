import type { Prisma } from "@prisma/client";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

/**
 * Snapshot-based undo/redo + version history for a conversation's spec.
 *
 * Every applied operation batch yields a brand-new, validated spec (the agent
 * never mutates in place), so we simply archive each resulting spec. `specVersion`
 * points at the active snapshot in `specHistory`; undo/redo move the pointer and
 * a new edit truncates the redo tail.
 */

export type SpecSnapshot = {
  /** The full spec at this point (null = the empty baseline before the first build). */
  spec: ZeroAPISpec | null;
  /** Human-readable summary of what produced this state. */
  summary: string;
  ts: number;
};

const MAX_SNAPSHOTS = 50;

export function parseHistory(raw: Prisma.JsonValue | null | undefined): SpecSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): SpecSnapshot[] => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    return [
      {
        spec: (e.spec ?? null) as ZeroAPISpec | null,
        summary: typeof e.summary === "string" ? e.summary : "Modification",
        ts: typeof e.ts === "number" ? e.ts : Date.now(),
      },
    ];
  });
}

/**
 * Append a new committed state. Seeds the pre-edit baseline as snapshot 0 the
 * first time, drops any redo tail, and caps the history length.
 */
export function commitSnapshot(
  history: SpecSnapshot[],
  version: number,
  beforeSpec: ZeroAPISpec | null,
  afterSpec: ZeroAPISpec | null,
  summary: string,
): { history: SpecSnapshot[]; version: number } {
  let h: SpecSnapshot[];
  if (history.length === 0) {
    h = [{ spec: beforeSpec, summary: "État initial", ts: Date.now() }];
  } else {
    h = history.slice(0, version + 1);
  }
  h.push({ spec: afterSpec, summary, ts: Date.now() });
  let v = h.length - 1;
  if (h.length > MAX_SNAPSHOTS) {
    const drop = h.length - MAX_SNAPSHOTS;
    h = h.slice(drop);
    v -= drop;
  }
  return { history: h, version: v };
}

export function canUndo(history: SpecSnapshot[], version: number): boolean {
  return version > 0 && history.length > 0;
}

export function canRedo(history: SpecSnapshot[], version: number): boolean {
  return version >= 0 && version < history.length - 1;
}

/** Move the pointer. Returns null when the move is not possible. */
export function moveVersion(
  history: SpecSnapshot[],
  version: number,
  action: "undo" | "redo" | "restore",
  target?: number,
): { version: number; spec: ZeroAPISpec | null } | null {
  let next: number;
  if (action === "undo") {
    if (!canUndo(history, version)) return null;
    next = version - 1;
  } else if (action === "redo") {
    if (!canRedo(history, version)) return null;
    next = version + 1;
  } else {
    if (target == null || target < 0 || target >= history.length || target === version) return null;
    next = target;
  }
  return { version: next, spec: history[next]?.spec ?? null };
}

/** Lightweight list for the client timeline (no heavy spec payloads). */
export function historyTimeline(
  history: SpecSnapshot[],
): Array<{ index: number; summary: string; ts: number }> {
  return history.map((s, index) => ({ index, summary: s.summary, ts: s.ts }));
}
