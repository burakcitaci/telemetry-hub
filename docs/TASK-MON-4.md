# TASK-MON-4 — Mixed structured-log predicates (2026-10-28)

## Acceptance criteria

- [x] The active monitor editor accepts numeric comparisons and text equality in one expression joined by `AND`.
- [x] `input_tokens > 10 AND Sku = "DSK-STD-01"` normalizes to the existing parameterized log-filter representation.
- [x] Attribute names remain case-sensitive and the UI calls this out explicitly.
- [x] Quoted text supports JSON escaping; invalid, unfinished, non-finite and unsupported string-inequality expressions fail before saving.
- [x] At most ten predicates and the existing 4000-character query bound remain enforced.
- [x] The monitor's aggregation produces a numeric result; the separate alert comparator/threshold evaluates that result.
- [x] SQL contains placeholders rather than attribute keys or values.
- [x] Focused frontend tests passed 14/14, backend tests passed 152/152, and the frontend production build passed.
- [ ] The single Graphify refresh attempt stopped before extraction because 33 documents require an unconfigured semantic backend. No retry or hook was run; generated artifacts remain excluded.

## Semantics

With aggregation `Count`, a threshold of `0` and comparator `Above`, the example fires when at least one matching log exists in the evaluation window. With a numeric aggregation such as `Maximum`, the numeric field is aggregated only across logs that satisfy every predicate, and the alert threshold is then applied to that aggregate.
