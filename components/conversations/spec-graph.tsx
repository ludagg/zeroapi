"use client";

import "@xyflow/react/dist/style.css";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import {
  AlertTriangle,
  Archive,
  Clock,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Share2,
  Sigma,
  Workflow,
  X,
} from "lucide-react";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { ConfirmationImpact } from "@/lib/operations/types";
import {
  buildSpecGraph,
  layoutGraph,
  NODE_WIDTH,
  type GraphField,
  type GraphNodeModel,
} from "@/lib/spec-graph";

/** Result of applying a graph-emitted operation (resolved by the parent). */
export type ApplyOperationResult =
  | { ok: true }
  | { ok: false; error?: string }
  | { ok: false; requiresConfirmation: ConfirmationImpact[] };

export type ApplyOperation = (op: {
  type: string;
  params: Record<string, unknown>;
  confirmed?: boolean;
}) => Promise<ApplyOperationResult>;

/** Node-level edit actions, provided via context so custom nodes stay thin. */
type GraphActions = {
  editable: boolean;
  onAddField: (resource: string) => void;
  onRemoveField: (resource: string, field: string) => void;
};
const GraphActionsContext = createContext<GraphActions>({
  editable: false,
  onAddField: () => {},
  onRemoveField: () => {},
});

const FIELD_TYPES = [
  "string",
  "text",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "email",
  "url",
  "uuid",
  "json",
  "enum",
] as const;

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
  const node = data as unknown as GraphNodeModel;
  const actions = useContext(GraphActionsContext);
  const editable = actions.editable && !node.system;
  const b = node.badges;
  const hasBadges = b.stateMachine || b.aggregates > 0 || b.softDelete || b.timestamps;
  // A relation is drawn FROM a real resource (source) TO any node (target);
  // system nodes (User) can't be a source.
  const style = actions.editable ? HANDLE_STYLE : HANDLE_STYLE_RO;

  return (
    <div
      className={
        "overflow-hidden rounded-[12px] border bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.18)] " +
        (node.system ? "border-dashed border-line-2 opacity-80" : "border-line")
      }
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Left} style={style} isConnectable={actions.editable} />
      <Handle type="source" position={Position.Right} style={style} isConnectable={editable} />

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
        {node.system ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">système</span>
        ) : (
          editable && (
            <button
              type="button"
              title="Ajouter un champ"
              onClick={() => actions.onAddField(node.name)}
              className="nodrag grid h-5 w-5 place-items-center rounded-[6px] border border-line bg-surface text-ink-2 transition hover:border-accent/50 hover:text-accent-ink"
            >
              <Plus className="h-3 w-3" />
            </button>
          )
        )}
      </div>

      {/* Fields */}
      <div className="py-1">
        {node.fields.map((f) => {
          const removable = editable && f.kind !== "pk";
          return (
            <div
              key={f.name}
              className="group grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-[2.5px]"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={"h-1.5 w-1.5 flex-shrink-0 rounded-full " + FIELD_DOT[f.kind]} />
                <span className="truncate font-mono text-[11px] text-ink-2">
                  {f.name}
                  {f.required && <span className="text-danger">*</span>}
                </span>
                {f.kind === "pk" && <KeyRound className="h-2.5 w-2.5 flex-shrink-0 text-accent-ink" />}
                {f.kind === "fk" && <Link2 className="h-2.5 w-2.5 flex-shrink-0 text-[#2A6FDB]" />}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted">{f.type}</span>
                {removable && (
                  <button
                    type="button"
                    title={`Supprimer ${f.name}`}
                    onClick={() => actions.onRemoveField(node.name, f.name)}
                    className="nodrag grid h-4 w-4 place-items-center rounded-[5px] text-muted opacity-0 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            </div>
          );
        })}
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

/** Relation types a user can pick when connecting two nodes. */
const RELATION_CHOICES: Array<{ kebab: string; short: string; label: string }> = [
  { kebab: "one-to-many", short: "1-N", label: "One-to-Many" },
  { kebab: "many-to-one", short: "N-1", label: "Many-to-One" },
  { kebab: "one-to-one", short: "1-1", label: "One-to-One" },
  { kebab: "many-to-many", short: "N-N", label: "Many-to-Many" },
];

/**
 * Read-only visual schema of the spec — and, when `onApplyOperation` is given,
 * an EDITOR. Dragging node→node creates a relation (`addRelation`); the "+" on a
 * card adds a field (`addField`); the "×" on a row removes one (`removeField`,
 * with a confirmation card when the engine flags an impact). Every change is a
 * validated OPERATION applied server-side — never a direct spec edit.
 */
export default function SpecGraph({
  spec,
  onApplyOperation,
}: {
  spec: ZeroAPISpec | null;
  onApplyOperation?: ApplyOperation;
}) {
  const editable = Boolean(onApplyOperation);
  const flow = useMemo(() => toFlow(spec), [spec]);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);

  // One popover/card open at a time (mutually exclusive).
  const [pending, setPending] = useState<{ source: string; target: string } | null>(null);
  const [addFieldFor, setAddFieldFor] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{
    resource: string;
    field: string;
    impacts: ConfirmationImpact[];
  } | null>(null);
  const [relField, setRelField] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync on spec change (new resource/relation/field…).
  useEffect(() => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [flow, setNodes, setEdges]);

  const closeAll = useCallback(() => {
    setPending(null);
    setAddFieldFor(null);
    setRemoveConfirm(null);
    setErr(null);
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    setAddFieldFor(null);
    setRemoveConfirm(null);
    setErr(null);
    setRelField("");
    setPending({ source: c.source, target: c.target });
  }, []);

  const requestAddField = useCallback(
    (resource: string) => {
      closeAll();
      setAddFieldFor(resource);
    },
    [closeAll],
  );

  const requestRemoveField = useCallback(
    async (resource: string, field: string) => {
      if (!onApplyOperation) return;
      closeAll();
      setBusy(true);
      const res = await onApplyOperation({ type: "removeField", params: { resource, field } });
      setBusy(false);
      if (!res.ok && "requiresConfirmation" in res) {
        setRemoveConfirm({ resource, field, impacts: res.requiresConfirmation });
      }
      // ok → graph refreshes from the new spec; plain error → parent toasted it.
    },
    [onApplyOperation, closeAll],
  );

  const actions = useMemo<GraphActions>(
    () => ({ editable, onAddField: requestAddField, onRemoveField: requestRemoveField }),
    [editable, requestAddField, requestRemoveField],
  );

  async function chooseRelationType(kebab: string) {
    if (!pending || !onApplyOperation) return;
    setBusy(true);
    setErr(null);
    const params: Record<string, unknown> = {
      from: pending.source,
      to: pending.target,
      relationType: kebab,
    };
    if (relField.trim()) params.field = relField.trim();
    if (kebab === "many-to-many") params.through = `${pending.source}${pending.target}`;

    const res = await onApplyOperation({ type: "addRelation", params });
    setBusy(false);
    if (res.ok) {
      setPending(null);
      setRelField("");
    } else {
      setErr("error" in res ? res.error ?? "Relation rejetée." : "Relation rejetée.");
    }
  }

  async function submitAddField(form: {
    name: string;
    type: string;
    required: boolean;
    unique: boolean;
    values: string;
  }) {
    if (!addFieldFor || !onApplyOperation) return;
    setBusy(true);
    setErr(null);
    const options: Record<string, unknown> = {};
    if (form.required) options.required = true;
    if (form.unique) options.unique = true;
    if (form.type === "enum") {
      options.values = form.values.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const params: Record<string, unknown> = {
      resource: addFieldFor,
      field: form.name.trim(),
      fieldType: form.type,
    };
    if (Object.keys(options).length > 0) params.options = options;

    const res = await onApplyOperation({ type: "addField", params });
    setBusy(false);
    if (res.ok) setAddFieldFor(null);
    else setErr("error" in res ? res.error ?? "Champ rejeté." : "Champ rejeté.");
  }

  async function confirmRemoveField() {
    if (!removeConfirm || !onApplyOperation) return;
    setBusy(true);
    setErr(null);
    const res = await onApplyOperation({
      type: "removeField",
      params: { resource: removeConfirm.resource, field: removeConfirm.field },
      confirmed: true,
    });
    setBusy(false);
    if (res.ok) setRemoveConfirm(null);
    else setErr("error" in res ? res.error ?? "Suppression rejetée." : "Suppression rejetée.");
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
    <GraphActionsContext.Provider value={actions}>
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

        {editable && !pending && !addFieldFor && !removeConfirm && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 font-mono text-[10px] text-muted backdrop-blur">
            <Link2 className="h-3 w-3 text-accent-ink" />
            Glisse pour relier · + pour ajouter un champ
          </div>
        )}

        {pending && (
          <RelationPopover
            source={pending.source}
            target={pending.target}
            field={relField}
            onField={setRelField}
            busy={busy}
            error={err}
            onChoose={chooseRelationType}
            onCancel={closeAll}
          />
        )}

        {addFieldFor && (
          <AddFieldPopover
            resource={addFieldFor}
            busy={busy}
            error={err}
            onSubmit={submitAddField}
            onCancel={closeAll}
          />
        )}

        {removeConfirm && (
          <RemoveFieldCard
            resource={removeConfirm.resource}
            field={removeConfirm.field}
            impacts={removeConfirm.impacts}
            busy={busy}
            error={err}
            onConfirm={confirmRemoveField}
            onCancel={closeAll}
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
    </GraphActionsContext.Provider>
  );
}

// ── Popovers ─────────────────────────────────────────────────────────────────

function PopoverShell({
  title,
  onCancel,
  children,
}: {
  title: React.ReactNode;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute left-1/2 top-3 z-20 w-[280px] -translate-x-1/2 overflow-hidden rounded-[12px] border border-line bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="font-mono text-[11px] text-ink-2">{title}</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annuler"
          className="grid h-5 w-5 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function ErrorNote({ error }: { error: string }) {
  return (
    <div className="mt-2 rounded-[8px] border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-[11px] leading-snug text-danger">
      {error}
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
    <PopoverShell
      onCancel={onCancel}
      title={
        <>
          <b className="text-ink">{source}</b> → <b className="text-ink">{target}</b>
        </>
      }
    >
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Type de relation</div>
      <div className="grid grid-cols-2 gap-1.5">
        {RELATION_CHOICES.map((c) => (
          <button
            key={c.kebab}
            type="button"
            disabled={busy}
            onClick={() => onChoose(c.kebab)}
            className="group flex flex-col items-start gap-0.5 rounded-[9px] border border-line bg-bg-2 px-2.5 py-2 text-left transition hover:border-accent/50 hover:bg-accent-soft disabled:opacity-50"
          >
            <span className="font-mono text-[13px] font-semibold text-ink group-hover:text-accent-ink">{c.short}</span>
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
      {error && <ErrorNote error={error} />}
      {busy && <BusyNote />}
    </PopoverShell>
  );
}

function AddFieldPopover({
  resource,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  resource: string;
  busy: boolean;
  error: string | null;
  onSubmit: (form: { name: string; type: string; required: boolean; unique: boolean; values: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("string");
  const [required, setRequired] = useState(false);
  const [unique, setUnique] = useState(false);
  const [values, setValues] = useState("");
  const canSubmit = name.trim().length > 0 && !busy && (type !== "enum" || values.trim().length > 0);

  return (
    <PopoverShell
      onCancel={onCancel}
      title={
        <>
          Champ sur <b className="text-ink">{resource}</b>
        </>
      }
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
        autoFocus
        placeholder="nom du champ"
        className="h-8 w-full rounded-[8px] border border-line bg-bg px-2.5 font-mono text-[12px] text-ink outline-none transition placeholder:text-muted-2 focus:border-ink disabled:opacity-50"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={busy}
        className="mt-2 h-8 w-full rounded-[8px] border border-line bg-bg px-2 font-mono text-[12px] text-ink outline-none focus:border-ink disabled:opacity-50"
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {type === "enum" && (
        <input
          value={values}
          onChange={(e) => setValues(e.target.value)}
          disabled={busy}
          placeholder="valeurs (séparées par ,)"
          className="mt-2 h-8 w-full rounded-[8px] border border-line bg-bg px-2.5 font-mono text-[11px] text-ink outline-none transition placeholder:text-muted-2 focus:border-ink disabled:opacity-50"
        />
      )}
      <div className="mt-2.5 flex items-center gap-3">
        <Check label="required" checked={required} onChange={setRequired} disabled={busy} />
        <Check label="unique" checked={unique} onChange={setUnique} disabled={busy} />
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit({ name, type, required, unique, values })}
        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] bg-accent text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Ajouter le champ
      </button>
      {error && <ErrorNote error={error} />}
    </PopoverShell>
  );
}

function RemoveFieldCard({
  resource,
  field,
  impacts,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  resource: string;
  field: string;
  impacts: ConfirmationImpact[];
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-3 z-20 w-[290px] -translate-x-1/2 overflow-hidden rounded-[12px] border border-warn/40 bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 border-b border-warn/30 bg-warn-soft/40 px-3 py-2 text-[12px] font-medium text-warn-ink">
        <AlertTriangle className="h-3.5 w-3.5" />
        Supprimer <span className="font-mono">{resource}.{field}</span> ?
      </div>
      <div className="space-y-2.5 p-3">
        {impacts.map((impact, i) => (
          <div key={i}>
            <div className="text-[12.5px] text-ink">{impact.reason}</div>
            {impact.impact.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {impact.impact.map((line, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[12px] text-muted">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-2" />
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-danger px-3 text-[13px] font-medium text-white transition hover:-translate-y-px disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Supprimer
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
        {error && <ErrorNote error={error} />}
      </div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

function BusyNote() {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
      <Loader2 className="h-3 w-3 animate-spin" />
      Application…
    </div>
  );
}
