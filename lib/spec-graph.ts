/**
 * Spec → graph model (pure, no React).
 *
 * Turns a ZeroAPISpec into a layout-agnostic set of nodes (resources, with
 * their fields + feature badges) and edges (relations). Both per-resource
 * relations (`resource.relations`, camelCase types) and top-level relations
 * (`spec.relations`, kebab-case types) are folded in and de-duplicated. Targets
 * that aren't real spec resources (e.g. the runtime-managed `User`) become
 * lightweight "system" nodes so the relation stays visible.
 *
 * Read-only: this never mutates the spec. The graph component lays these out
 * and renders them; editing (graph → spec) is a later step.
 */

import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

export type RelLabel = "1-1" | "1-N" | "N-1" | "N-N";
export type GraphFieldKind = "pk" | "fk" | "enum" | "scalar";

export interface GraphField {
  name: string;
  type: string;
  required: boolean;
  kind: GraphFieldKind;
}

export interface GraphBadges {
  stateMachine: boolean;
  aggregates: number;
  softDelete: boolean;
  timestamps: boolean;
}

export interface GraphNodeModel {
  id: string;
  name: string;
  fields: GraphField[];
  badges: GraphBadges;
  /** Referenced by a relation but not a real spec resource (e.g. User). */
  system: boolean;
}

export interface GraphEdgeModel {
  id: string;
  source: string;
  target: string;
  label: RelLabel;
  /** Source-side field carrying the relation (FK), when known. */
  field?: string;
  /** Same resource on both ends (e.g. self many-to-many "follow"). */
  selfLoop: boolean;
}

export interface SpecGraphModel {
  nodes: GraphNodeModel[];
  edges: GraphEdgeModel[];
}

const PER_RESOURCE_LABEL: Record<string, RelLabel> = {
  oneToOne: "1-1",
  oneToMany: "1-N",
  manyToOne: "N-1",
  manyToMany: "N-N",
};

const TOP_LEVEL_LABEL: Record<string, RelLabel> = {
  "one-to-one": "1-1",
  "one-to-many": "1-N",
  "many-to-one": "N-1",
  "many-to-many": "N-N",
};

/** Build the graph model from a spec. Safe on partial/empty specs. */
export function buildSpecGraph(spec: ZeroAPISpec | null | undefined): SpecGraphModel {
  if (!spec || !Array.isArray(spec.resources) || spec.resources.length === 0) {
    return { nodes: [], edges: [] };
  }

  const resourceNames = new Set(spec.resources.map((r) => r.name));
  const nodes: GraphNodeModel[] = [];
  const systemNodes = new Map<string, GraphNodeModel>();
  const edges: GraphEdgeModel[] = [];
  const seenEdge = new Set<string>();

  function ensureSystemNode(name: string): void {
    if (resourceNames.has(name) || systemNodes.has(name)) return;
    systemNodes.set(name, {
      id: name,
      name,
      fields: [{ name: "id", type: "uuid", required: true, kind: "pk" }],
      badges: { stateMachine: false, aggregates: 0, softDelete: false, timestamps: false },
      system: true,
    });
  }

  function pushEdge(edge: GraphEdgeModel): void {
    // De-dupe relations described twice (per-resource + top-level mirror).
    const key = `${edge.source}|${edge.target}|${edge.field ?? edge.label}`;
    if (seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push(edge);
  }

  for (const r of spec.resources) {
    // Fields carrying a relation FK (per-resource relations with a `field`).
    const fkFields = new Set<string>();
    for (const rel of r.relations ?? []) {
      if (rel.field) fkFields.add(rel.field);
    }

    const fields: GraphField[] = [
      { name: "id", type: "uuid", required: true, kind: "pk" },
    ];
    for (const [name, def] of Object.entries(r.fields ?? {})) {
      const type = def.type === "enum" && def.values?.length ? `enum(${def.values.length})` : def.type;
      fields.push({
        name,
        type,
        required: def.required ?? false,
        kind: fkFields.has(name) ? "fk" : def.type === "enum" ? "enum" : "scalar",
      });
    }

    nodes.push({
      id: r.name,
      name: r.name,
      fields,
      badges: {
        stateMachine: Boolean(r.stateMachine),
        aggregates: r.aggregates?.length ?? 0,
        softDelete: r.softDelete === true,
        timestamps: r.timestamps === true,
      },
      system: false,
    });

    // Per-resource relations (camelCase).
    for (const rel of r.relations ?? []) {
      const target = rel.resource;
      ensureSystemNode(target);
      pushEdge({
        id: `pr:${r.name}->${target}:${rel.field ?? rel.type}`,
        source: r.name,
        target,
        label: PER_RESOURCE_LABEL[rel.type] ?? "1-N",
        field: rel.field,
        selfLoop: target === r.name,
      });
    }
  }

  // Top-level relations (kebab-case).
  for (const rel of spec.relations ?? []) {
    ensureSystemNode(rel.from);
    ensureSystemNode(rel.to);
    pushEdge({
      id: `tl:${rel.from}->${rel.to}:${rel.field ?? rel.type}`,
      source: rel.from,
      target: rel.to,
      label: TOP_LEVEL_LABEL[rel.type] ?? "1-N",
      field: rel.field,
      selfLoop: rel.from === rel.to,
    });
  }

  return { nodes: [...nodes, ...systemNodes.values()], edges };
}

// ── Layout ───────────────────────────────────────────────────────────────────

export interface NodePosition {
  x: number;
  y: number;
}

export const NODE_WIDTH = 240;
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 46;
const BADGE_HEIGHT = 30;
const NODE_PADDING = 18;
const GAP_X = 80;
const GAP_Y = 48;

/** Estimated rendered height of a node (so a column layout doesn't overlap). */
export function estimateNodeHeight(node: GraphNodeModel): number {
  const hasBadges =
    node.badges.stateMachine ||
    node.badges.aggregates > 0 ||
    node.badges.softDelete ||
    node.badges.timestamps;
  return (
    HEADER_HEIGHT +
    node.fields.length * ROW_HEIGHT +
    (hasBadges ? BADGE_HEIGHT : 0) +
    NODE_PADDING
  );
}

/**
 * Simple column ("masonry") layout: spread nodes across `ceil(sqrt(n))`
 * columns, stacking each column by real (estimated) heights so tall nodes don't
 * collide with their neighbours. Deterministic and readable — good enough for
 * read-only display; a force/dagre layout can come later.
 */
export function layoutGraph(nodes: GraphNodeModel[]): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const colHeights = new Array<number>(cols).fill(0);

  nodes.forEach((node, i) => {
    const col = i % cols;
    const x = col * (NODE_WIDTH + GAP_X);
    const y = colHeights[col];
    positions.set(node.id, { x, y });
    colHeights[col] = y + estimateNodeHeight(node) + GAP_Y;
  });

  return positions;
}
