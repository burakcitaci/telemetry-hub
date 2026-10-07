// A facet is a named dimension with a set of values and per-value counts.
// The source of truth is the raw records; this just describes what can be picked.

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facet {
  /** stable id, e.g. "host.name" or "service.version" */
  key: string;
  /** human label, e.g. "Host" */
  label: string;
  values: FacetValue[];
  /** where the value lives on a record */
  accessor: (record: Record<string, any>) => string | null;
}

export interface FacetSelection {
  /** facet key → set of selected values. Empty array = "no filter on this facet". */
  [facetKey: string]: string[];
}

export interface FacetDefinition {
  /** facet key shown in UI */
  key: string;
  /** human label */
  label: string;
  /** extract the value from a record */
  accessor: (record: Record<string, any>) => string | null;
}

/** Build a Facet from a definition + an array of records. */
export function buildFacet(def: FacetDefinition, records: Record<string, any>[]): Facet {
  const counts = new Map<string, number>();
  for (const r of records) {
    const raw = def.accessor(r);
    if (raw == null) continue;
    const v = String(raw).trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const values = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
  return { key: def.key, label: def.label, values, accessor: def.accessor };
}

/** Does a record pass every facet filter? Empty selection = no restriction. */
/** Does a record pass every facet filter? Empty selection = no restriction. */
export function matchesFacets(
  record: Record<string, any>,
  facets: Facet[],
  selection: FacetSelection,
): boolean {
  for (const facet of facets) {
    const wanted = selection[facet.key];
    if (!wanted || wanted.length === 0) continue;
    const raw = facet.accessor(record);
    if (raw == null) return false;
    const v = String(raw);
    if (!wanted.map(String).includes(v)) return false;
  }
  return true;
}

/** Group records by the tuple of values of the given facet keys. */
export function groupByFacets(
  records: Record<string, any>[],
  facets: Facet[],
  groupKeys: string[],
): Map<string, { label: string; records: Record<string, any>[] }> {
  const byKey = new Map(facets.map((f) => [f.key, f]));
  const groups = new Map<string, { label: string; records: Record<string, any>[] }>();

  for (const r of records) {
    const parts: string[] = [];
    for (const k of groupKeys) {
      const f = byKey.get(k);
      parts.push(f ? (f.accessor(r) ?? '—') : '—');
    }
    const id = parts.join(' · ');
    if (!groups.has(id)) groups.set(id, { label: id, records: [] });
    groups.get(id)!.records.push(r);
  }
  return groups;
}