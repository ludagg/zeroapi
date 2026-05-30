"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Archive, Clock, KeyRound, Link2, Loader2, Share2, Sigma, Workflow, X } from "lucide-react";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  buildSpecGraph,
  layoutGraph,
  NODE_WIDTH,
  type GraphField,
  type GraphNodeModel,
} from "@/lib/spec-graph";

/** Result of applying a graph-emitted operation (resolved by the parent). */
export type ApplyOperationResult = { ok: boolean; error?: string };
export type ApplyOperation = (op: {
  type: string;
  params: Record<string, unknown>;
}) => Promise<ApplyOperationResult>;

type ResourceNodeData = GraphNodeModel & { editable: boolean };

const FIELD_DOT: Record<GraphField["kind"], string> = {
  pk: "bg-accent",
  fk: "bg-[#2A6FDB]",
  enum: "bg-warn",
  scalar: "bg-muted-2",
};

const HANDLE_STYLE = {
  width: 9,
  height: 9,
  background: "var(--accent)",
  border: "2px solid var(--surface)",
};
const HANDLE_STYLE_RO = { ...HANDLE_STYLE, background: "var(--line-2)" };

/** A resource rendered as a database-table-style card. */
function ResourceNode({ data }: NodeProps) {
  const node = data as unknown as ResourceNodeData;
  const b = node.badges;
  const hasBadges = b.stateMachine || b.aggregates > 0 || b.softDelete || b.timestamps;
  // Connectable when editing is enabled. A relation is drawn FROM a real
  // resource (source) TO any node (target) — system nodes (User) can't be a source.
  const sourceConnectable = node.editable && !node.system;
  const targetConnectable = node.editable;
  const style = node.editable ? HANDLE_STYLE : HANDLE_STYLE_RO;

  return (
    <div
      className={
        "overflow-hidden rounded-[12px] border bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.18)] " +
        (node.system ? "border-dashed border-line-2 opacity-80" : "border-line")
      }
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Left} style={style} isConnectable={targetConnectable} />
      <Handle type="source" position={Position.Right} style={style} isConnectable={sourceConnectable} />

      {/* Header */}
      <div
        className={
          "flex items-center gap-2 border-b px-3 py-2 " +
          (node.system ? "border-line bg-bg-2" : "border-line bg-gradient-to-b from-accent-soft/60 to-surface")
        }
      >
        <span
          className={
            "grid h-5 w-5 flex-shrink-0 place-items-center rounded-[6px] " +
            (node.system ? "bg-bg-3 text-muted" : "bg-accent text-accent-ink")
          }
        >
          {node.system ? <Share2 className="h-3 w-3" /> : <span className="font-mono text-[11px] font-bold">{node.name[0]}</span>}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{node.name}</span>
        {node.system && (
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">système</span>
        )}
      </div>

      {/* Fields */}
      <div className="py-1">
        {node.fields.map((f) => (
          <div key={f.name} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-[2.5px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={"h-1.5 w-1.5 flex-shrink-0 rounded-full " + FIELD_DOT[f.kind]} />
              <span className="truncate font-mono text-[11px] text-ink-2">
                {f.name}
                {f.required && <span className="text-danger">*</span>}
              </span>
              {f.kind === "pk" && <KeyRound className="h-2.5 w-2.5 flex-shrink-0 text-accent-ink" />}
              {f.kind === "fk" && <Link2 className="h-2.5 w-2.5 flex-shrink-0 text-[#2A6FDB]" />}
            </span>
            <span className="font-mono text-[10px] text-muted">{f.type}</span>
          </div>
        ))}
      </div>

      {/* Feature badges */}
      {hasBadges && (
        <div className="flex flex-wrap items-center gap-1 border-t border-line bg-bg-2/60 px-2.5 py-1.5">
          {b.stateMachine && <Badge icon={<Workflow className="h-2.5 w-2.5" />} label="workflow" />}
          {b.aggregates > 0 && <Badge icon={<Sigma className="h-2.5 w-2.5" />} label={`${b.aggregates} agg`} />}
          {b.softDelete && <Badge icon={<Archive className="h-2.5 w-2.5" />} label="soft-delete" />}
          {b.timestamps && <Badge icon={<Clock className="h-2.5 w-2.5" />} label="timestamps" />}
        </div>
      )}
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-1.5 py-px font-mono text-[9px] text-accent-ink">
      {icon}
      {label}
    </span>
  );
}

const nodeTypes = { resource: ResourceNode };

function toFlow(spec: ZeroAPISpec | null, editable: boolean): { nodes: Node[]; edges: Edge[] } {
  const model = buildSpecGraph(spec);
  const positions = layoutGraph(model.nodes);

  const nodes: Node[] = model.nodes.map((n) => ({
    id: n.id,
    type: "resource",
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: { ...n, editable } as unknown as Record<string, unknown>,
  }));

  const edges: Edge[] = model.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    label: e.label,
    selectable: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--muted)" },
    style: { stroke: e.selfLoop ? "var(--accent)" : "var(--line-2)", strokeWidth: 1.5 },
    labelStyle: { fill: "var(--ink-2)", fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: "var(--surface)", stroke: "var(--line)" },
    labelBgPadding: [5, 2] as [number, number],
    labelBgBorderRadius: 5,
  }));

  return { nodes, edges };
}

/** The relation types a user can pick when connecting two nodes. */
const RELATION_CHOICES: Array<{ kebab: string; short: string; label: string }> = [
  { kebab: "one-to-many", short: "1-N", label: "One-to-Many" },
  { kebab: "many-to-one", short: "N-1", label: "Many-to-One" },
  { kebab: "one-to-one", short: "1-1", label: "One-to-One" },
  { kebab: "many-to-many", short: "N-N", label: "Many-to-Many" },
];

/**
 * Read-only visual schema of the spec — and, when `onApplyOperation` is given,
 * an EDITOR for creating relations: dragging from one node to another emits an
 * `addRelation` operation (validated + applied server-side via `applyOperation`,
 * never a direct spec edit). The graph rebuilds from the returned spec.
 */
export default function SpecGraph({
  spec,
  onApplyOperation,
}: {
  spec: ZeroAPISpec | null;
  onApplyOperation?: ApplyOperation;
}) {
  const editable = Boolean(onApplyOperation);
  const flow = useMemo(() => toFlow(spec, editable), [spec, editable]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);

  // Pending connection awaiting a relation-type choice.
  const [pending, setPending] = useState<{ source: string; target: string } | null>(null);
  const [field, setField] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync on spec change (new resource, new relation, modified fields…).
  useEffect(() => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [flow, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    setErr(null);
    setField("");
    setPending({ source: c.source, target: c.target });
  }, []);

  async function chooseType(kebab: string) {
    if (!pending || !onApplyOperation) return;
    setBusy(true);
    setErr(null);
    const params: Record<string, unknown> = {
      from: pending.source,
      to: pending.target,
      relationType: kebab,
    };
    if (field.trim()) params.field = field.trim();
    // many-to-many needs a join table; derive a sensible default name.
    if (kebab === "many-to-many") params.through = `${pending.source}${pending.target}`;

    const res = await onApplyOperation({ type: "addRelation", params });
    setBusy(false);
    if (res.ok) {
      setPending(null);
      setField("");
    } else {
      setErr(res.error ?? "Relation rejetée.");
    }
  }

  if (flow.nodes.length === 0) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[12px] border border-line bg-bg-2 text-muted">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="text-[13px] font-medium text-ink-2">Aucune ressource à afficher</div>
          <p className="mx-auto mt-1.5 max-w-[230px] text-[12px] leading-snug text-muted">
            Décris ou génère ton API : les ressources et leurs relations
            apparaîtront ici sous forme de schéma.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="spec-graph relative h-full w-full bg-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.spec-graph .react-flow__controls{box-shadow:0 4px 16px rgba(0,0,0,.2);border-radius:9px;overflow:hidden}
.spec-graph .react-flow__controls-button{background:var(--surface);border-bottom:1px solid var(--line);color:var(--ink-2)}
.spec-graph .react-flow__controls-button:hover{background:var(--bg-2)}
.spec-graph .react-flow__controls-button svg{fill:currentColor}
.spec-graph .react-flow__edge-path{stroke-linecap:round}
.spec-graph .react-flow__handle{transition:transform .12s}
.spec-graph .react-flow__handle:hover{transform:scale(1.35)}
`,
        }}
      />

      {editable && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[10px] text-muted backdrop-blur">
          <Link2 className="h-3 w-3 text-accent-ink" />
          Glisse d&apos;un nœud à l&apos;autre pour créer une relation
        </div>
      )}

      {pending && (
        <RelationPopover
          source={pending.source}
          target={pending.target}
          field={field}
          onField={setField}
          busy={busy}
          error={err}
          onChoose={chooseType}
          onCancel={() => {
            setPending(null);
            setErr(null);
          }}
        />
      )}

      {/* The key forces a re-fit when the topology (nodes/edges) changes. */}
      <ReactFlow
        key={`${flow.nodes.map((n) => n.id).join(",")}|${flow.edges.length}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={editable ? onConnect : undefined}
        nodesConnectable={editable}
        connectionLineStyle={{ stroke: "var(--accent)", strokeWidth: 2 }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={1.6}
        edgesFocusable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--line)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

function RelationPopover({
  source,
  target,
  field,
  onField,
  busy,
  error,
  onChoose,
  onCancel,
}: {
  source: string;
  target: string;
  field: string;
  onField: (v: string) => void;
  busy: boolean;
  error: string | null;
  onChoose: (kebab: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-3 z-20 w-[270px] -translate-x-1/2 overflow-hidden rounded-[12px] border border-line bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-mono text-[11px] text-ink-2">
          <b className="text-ink">{source}</b> → <b className="text-ink">{target}</b>
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annuler"
          className="grid h-5 w-5 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2.5">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          Type de relation
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {RELATION_CHOICES.map((c) => (
            <button
              key={c.kebab}
              type="button"
              disabled={busy}
              onClick={() => onChoose(c.kebab)}
              className="group flex flex-col items-start gap-0.5 rounded-[9px] border border-line bg-bg-2 px-2.5 py-2 text-left transition hover:border-accent/50 hover:bg-accent-soft disabled:opacity-50"
            >
              <span className="font-mono text-[13px] font-semibold text-ink group-hover:text-accent-ink">
                {c.short}
              </span>
              <span className="text-[10px] text-muted">{c.label}</span>
            </button>
          ))}
        </div>

        <input
          value={field}
          onChange={(e) => onField(e.target.value)}
          disabled={busy}
          placeholder="champ FK (optionnel)"
          className="mt-2.5 h-8 w-full rounded-[8px] border border-line bg-bg px-2.5 font-mono text-[11px] text-ink outline-none transition placeholder:text-muted-2 focus:border-ink disabled:opacity-50"
        />

        {error && (
          <div className="mt-2 rounded-[8px] border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-[11px] leading-snug text-danger">
            {error}
          </div>
        )}
        {busy && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Application…
          </div>
        )}
      </div>
    </div>
  );
}
