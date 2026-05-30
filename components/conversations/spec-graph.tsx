"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo } from "react";
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
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Archive, Clock, KeyRound, Link2, Share2, Sigma, Workflow } from "lucide-react";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  buildSpecGraph,
  layoutGraph,
  NODE_WIDTH,
  type GraphField,
  type GraphNodeModel,
} from "@/lib/spec-graph";

const FIELD_DOT: Record<GraphField["kind"], string> = {
  pk: "bg-accent",
  fk: "bg-[#2A6FDB]",
  enum: "bg-warn",
  scalar: "bg-muted-2",
};

/** A resource rendered as a database-table-style card. */
function ResourceNode({ data }: NodeProps) {
  const node = data as unknown as GraphNodeModel;
  const b = node.badges;
  const hasBadges = b.stateMachine || b.aggregates > 0 || b.softDelete || b.timestamps;

  return (
    <div
      className={
        "overflow-hidden rounded-[12px] border bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.18)] " +
        (node.system ? "border-dashed border-line-2 opacity-80" : "border-line")
      }
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} isConnectable={false} />

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

const HANDLE_STYLE = {
  width: 7,
  height: 7,
  background: "var(--line-2)",
  border: "2px solid var(--surface)",
};

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-1.5 py-px font-mono text-[9px] text-accent-ink">
      {icon}
      {label}
    </span>
  );
}

const nodeTypes = { resource: ResourceNode };

function toFlow(spec: ZeroAPISpec | null): { nodes: Node[]; edges: Edge[] } {
  const model = buildSpecGraph(spec);
  const positions = layoutGraph(model.nodes);

  const nodes: Node[] = model.nodes.map((n) => ({
    id: n.id,
    type: "resource",
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: n as unknown as Record<string, unknown>,
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

/**
 * Read-only visual schema of the spec (resources as nodes, relations as edges).
 * Rebuilds whenever the `spec` prop changes — so Kia's edits appear live.
 */
export default function SpecGraph({ spec }: { spec: ZeroAPISpec | null }) {
  const flow = useMemo(() => toFlow(spec), [spec]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);

  // Sync on spec change (new resource, new relation, modified fields…).
  useEffect(() => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [flow, setNodes, setEdges]);

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
    <div className="spec-graph h-full w-full bg-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.spec-graph .react-flow__controls{box-shadow:0 4px 16px rgba(0,0,0,.2);border-radius:9px;overflow:hidden}
.spec-graph .react-flow__controls-button{background:var(--surface);border-bottom:1px solid var(--line);color:var(--ink-2)}
.spec-graph .react-flow__controls-button:hover{background:var(--bg-2)}
.spec-graph .react-flow__controls-button svg{fill:currentColor}
.spec-graph .react-flow__edge-path{stroke-linecap:round}
`,
        }}
      />
      {/* The key forces a re-fit when the topology (nodes/edges) changes. */}
      <ReactFlow
        key={`${flow.nodes.map((n) => n.id).join(",")}|${flow.edges.length}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={1.6}
        nodesConnectable={false}
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
