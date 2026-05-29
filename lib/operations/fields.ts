/** Field operations (OPERATIONS.md §2.3 + §3.3, §3.4). */

import type {
  FieldDefinition,
  FieldType,
  ZeroAPISpec,
} from "@ludagg/zeroapi-runtime";
import type {
  AddEnumValueOp,
  AddFieldOp,
  FieldOptions,
  ModifyFieldOptionsOp,
  RemoveEnumValueOp,
  RemoveFieldOp,
  RenameFieldOp,
  SetEnumValuesOp,
  SetFieldRequiredOp,
  SetFieldTypeOp,
} from "./types";
import { ConfirmationRequiredError, OperationError } from "./types";
import { clone, getResource } from "./helpers";

const FIELD_TYPES: FieldType[] = [
  "string", "text", "number", "integer", "decimal", "boolean",
  "date", "datetime", "email", "url", "uuid", "file", "file[]", "json", "enum",
];

/**
 * Safe "widening" transitions: enlarging a column never loses data. Anything
 * not listed is treated as a 🔴 narrowing (OPERATIONS.md §3.4) and needs
 * explicit confirmation. Same-type is always allowed.
 */
const WIDENING: Record<string, ReadonlySet<string>> = {
  integer: new Set(["number", "decimal", "string", "text"]),
  number: new Set(["decimal", "string", "text"]),
  decimal: new Set(["string", "text"]),
  boolean: new Set(["string", "text"]),
  date: new Set(["datetime", "string", "text"]),
  datetime: new Set(["string", "text"]),
  email: new Set(["string", "text"]),
  url: new Set(["string", "text"]),
  uuid: new Set(["string", "text"]),
  string: new Set(["text"]),
};

function isNarrowing(from: FieldType, to: FieldType): boolean {
  if (from === to) return false;
  return !(WIDENING[from]?.has(to) ?? false);
}

function assertFieldType(t: unknown): asserts t is FieldType {
  if (typeof t !== "string" || !(FIELD_TYPES as string[]).includes(t)) {
    throw new OperationError(
      `type de champ invalide "${String(t)}" (autorisés : ${FIELD_TYPES.join(", ")})`,
    );
  }
}

function getField(spec: ZeroAPISpec, resource: string, field: string): FieldDefinition {
  const r = getResource(spec, resource);
  const f = r.fields[field];
  if (!f) {
    throw new OperationError(`Le champ "${field}" n'existe pas sur "${resource}"`);
  }
  return f;
}

function applyOptions(target: FieldDefinition, options: FieldOptions | undefined): void {
  if (!options) return;
  for (const [k, v] of Object.entries(options)) {
    if (v === undefined) continue;
    (target as unknown as Record<string, unknown>)[k] = Array.isArray(v) ? [...v] : v;
  }
}

export function addField(spec: ZeroAPISpec, op: AddFieldOp): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  assertFieldType(op.fieldType);
  if (op.field in r.fields) {
    throw new OperationError(
      `Le champ "${op.field}" existe déjà sur "${op.resource}"`,
    );
  }
  if (op.fieldType === "enum" && (!op.options?.values || op.options.values.length === 0)) {
    throw new OperationError(`Le champ enum "${op.field}" doit déclarer des "values"`);
  }
  const def: FieldDefinition = { type: op.fieldType };
  applyOptions(def, op.options);
  const next = clone(spec);
  getResource(next, op.resource).fields[op.field] = def;
  return next;
}

export function modifyFieldOptions(
  spec: ZeroAPISpec,
  op: ModifyFieldOptionsOp,
): ZeroAPISpec {
  const current = getField(spec, op.resource, op.field);
  if (current.type === "enum" && op.options.values && op.options.values.length === 0) {
    throw new OperationError(`Un champ enum ne peut pas avoir une liste "values" vide`);
  }
  const next = clone(spec);
  applyOptions(getResource(next, op.resource).fields[op.field], op.options);
  return next;
}

export function setFieldType(spec: ZeroAPISpec, op: SetFieldTypeOp): ZeroAPISpec {
  const current = getField(spec, op.resource, op.field);
  assertFieldType(op.fieldType);
  if (op.fieldType === "enum" && (!op.options?.values || op.options.values.length === 0)) {
    throw new OperationError(`Le champ enum "${op.field}" doit déclarer des "values"`);
  }
  if (isNarrowing(current.type, op.fieldType) && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "setFieldType",
      `Changer "${op.resource}.${op.field}" de "${current.type}" vers "${op.fieldType}" est une transition rétrécissante (risque de migration destructive). Confirmez pour appliquer.`,
      [`${op.resource}.${op.field} : ${current.type} → ${op.fieldType}`],
    );
  }
  const next = clone(spec);
  const f = getResource(next, op.resource).fields[op.field];
  f.type = op.fieldType;
  // Drop enum values when leaving the enum type.
  if (op.fieldType !== "enum" && "values" in f) delete f.values;
  applyOptions(f, op.options);
  return next;
}

export function setFieldRequired(
  spec: ZeroAPISpec,
  op: SetFieldRequiredOp,
): ZeroAPISpec {
  getField(spec, op.resource, op.field);
  const next = clone(spec);
  getResource(next, op.resource).fields[op.field].required = op.required;
  return next;
}

/** Every place a field name is referenced inside its own resource + top-level. */
function fieldReferences(spec: ZeroAPISpec, resource: string, field: string): string[] {
  const refs: string[] = [];
  const r = getResource(spec, resource);
  for (const rel of r.relations ?? []) {
    if (rel.field === field) refs.push(`relation ${resource} → ${rel.resource} (FK "${field}")`);
  }
  for (const rel of spec.relations ?? []) {
    if (rel.from === resource && rel.field === field) {
      refs.push(`relation top-level ${rel.from} → ${rel.to} (FK "${field}")`);
    }
  }
  if (r.searchable?.includes(field)) refs.push(`searchable de ${resource}`);
  return refs;
}

export function renameField(spec: ZeroAPISpec, op: RenameFieldOp): ZeroAPISpec {
  getField(spec, op.resource, op.oldName);
  const r = getResource(spec, op.resource);
  if (op.newName === op.oldName) {
    throw new OperationError("newName est identique à oldName");
  }
  if (op.newName in r.fields) {
    throw new OperationError(
      `Le champ "${op.newName}" existe déjà sur "${op.resource}"`,
    );
  }
  const refs = fieldReferences(spec, op.resource, op.oldName);
  if (refs.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "renameField",
      `Renommer "${op.resource}.${op.oldName}" propagera vers ${refs.length} référence(s). Confirmez pour appliquer.`,
      refs,
    );
  }

  const next = clone(spec);
  const nr = getResource(next, op.resource);
  // Rebuild fields preserving insertion order with the new key.
  const rebuilt: Record<string, FieldDefinition> = {};
  for (const [key, def] of Object.entries(nr.fields)) {
    rebuilt[key === op.oldName ? op.newName : key] = def;
  }
  nr.fields = rebuilt;
  for (const rel of nr.relations ?? []) {
    if (rel.field === op.oldName) rel.field = op.newName;
  }
  for (const rel of next.relations ?? []) {
    if (rel.from === op.resource && rel.field === op.oldName) rel.field = op.newName;
  }
  if (nr.searchable) {
    nr.searchable = nr.searchable.map((f) => (f === op.oldName ? op.newName : f));
  }
  return next;
}

export function removeField(spec: ZeroAPISpec, op: RemoveFieldOp): ZeroAPISpec {
  const r = getResource(spec, op.resource);
  getField(spec, op.resource, op.field);
  if (Object.keys(r.fields).length <= 1) {
    throw new OperationError(
      `Impossible de retirer le dernier champ de "${op.resource}" — une ressource doit garder au moins un champ`,
    );
  }
  const refs = fieldReferences(spec, op.resource, op.field);
  if (refs.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "removeField",
      `Le champ "${op.resource}.${op.field}" est référencé par ${refs.length} élément(s). Confirmez pour retirer le champ et ses références.`,
      refs,
    );
  }

  const next = clone(spec);
  const nr = getResource(next, op.resource);
  delete nr.fields[op.field];
  // Cascade: drop relations that used it as FK and the searchable entry.
  if (nr.relations) nr.relations = nr.relations.filter((rel) => rel.field !== op.field);
  if (next.relations) {
    next.relations = next.relations.filter(
      (rel) => !(rel.from === op.resource && rel.field === op.field),
    );
  }
  if (nr.searchable) nr.searchable = nr.searchable.filter((f) => f !== op.field);
  return next;
}

function getEnumField(spec: ZeroAPISpec, resource: string, field: string): FieldDefinition {
  const f = getField(spec, resource, field);
  if (f.type !== "enum") {
    throw new OperationError(`Le champ "${resource}.${field}" n'est pas de type enum`);
  }
  return f;
}

export function addEnumValue(spec: ZeroAPISpec, op: AddEnumValueOp): ZeroAPISpec {
  getEnumField(spec, op.resource, op.field);
  const next = clone(spec);
  const f = getResource(next, op.resource).fields[op.field];
  const values = Array.isArray(f.values) ? f.values : [];
  if (!values.includes(op.value)) values.push(op.value); // idempotent
  f.values = values;
  return next;
}

export function removeEnumValue(
  spec: ZeroAPISpec,
  op: RemoveEnumValueOp,
): ZeroAPISpec {
  const f = getEnumField(spec, op.resource, op.field);
  const values = Array.isArray(f.values) ? f.values : [];
  if (!values.includes(op.value)) {
    throw new OperationError(
      `La valeur "${op.value}" n'existe pas dans "${op.resource}.${op.field}"`,
    );
  }
  if (values.length <= 1) {
    throw new OperationError(`Un enum doit conserver au moins une valeur`);
  }
  if (!op.confirmed) {
    throw new ConfirmationRequiredError(
      "removeEnumValue",
      `Retirer la valeur "${op.value}" de "${op.resource}.${op.field}" peut casser des lignes existantes. Confirmez pour appliquer.`,
      [`${op.resource}.${op.field} : retrait de "${op.value}"`],
    );
  }
  const next = clone(spec);
  const nf = getResource(next, op.resource).fields[op.field];
  nf.values = (nf.values ?? []).filter((v) => v !== op.value);
  return next;
}

export function setEnumValues(spec: ZeroAPISpec, op: SetEnumValuesOp): ZeroAPISpec {
  const f = getEnumField(spec, op.resource, op.field);
  if (!Array.isArray(op.values) || op.values.length === 0) {
    throw new OperationError(`values doit être un tableau non vide`);
  }
  const current = Array.isArray(f.values) ? f.values : [];
  const dropped = current.filter((v) => !op.values.includes(v));
  if (dropped.length > 0 && !op.confirmed) {
    throw new ConfirmationRequiredError(
      "setEnumValues",
      `Remplacer les valeurs de "${op.resource}.${op.field}" retire ${dropped.length} valeur(s) existante(s). Confirmez pour appliquer.`,
      dropped.map((v) => `${op.resource}.${op.field} : retrait de "${v}"`),
    );
  }
  const next = clone(spec);
  getResource(next, op.resource).fields[op.field].values = [...op.values];
  return next;
}
