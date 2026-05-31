# Product Scope Freeze — Amendment 2 (Feb 2026)

> Origin documents: `docs/product-scope-freeze.md` (May 9, 2026),
> `docs/product-scope-freeze-amend-1.md` (May 19, 2026).
> This file records a single decision change. It does NOT replace either
> predecessor; all other decisions in both prior documents remain in
> force unless explicitly overridden below.

## Context

The original scope-freeze (Decision 1) banned full admin parity on Expo
and capped the cockpit at **5 tabs** (`home, qa, validation, finance,
profile`). Amendment 1 (May 19) added 8 read-mostly drill-down surfaces
reachable from the admin home's Operations grid:
`users, team, contracts, templates, integrations, inbox, marketplace,
master` — bringing the total to **13 admin surfaces** on Expo.

Over the next 6 months, three categories of incident kept producing
"I had to open the laptop" friction:

1. **Cognition fan-out during prod incidents.** Admins triaging a
   stuck module needed to see the execution console (decision stream,
   override memory, parallel universes) from the phone. Web-only forced
   either context-switching or escalation.
2. **Payouts ops at the daemon level.** When the payouts-v2 worker
   advanced an item to `failed` after retries exhausted, the on-call
   admin needed the queue view AND batch drill-down AND single-item
   force-retry from the same surface — not a 3-tab dance with the web
   build that's still tuned for desk usage.
3. **Reconciliation triage.** Money substrate reconciler runs every
   30 min. When a divergence fires on weekend, the admin needs the
   summary + last 24h runs + open divergences on the phone. Sending
   them to web meant divergence age sometimes crossed the 24h SLA.

The fix is **not** to make Expo admin a full replacement for web admin
(that remains forbidden under Decision 1) — the fix is to grow the
Operations grid by **7 additional read-mostly + narrow-write surfaces**
that materially reduce on-call MTTR without bloating cockpit signal.

## Amended Decision 1 (supersedes Amendment 1 §1 table)

Expo admin remains **cockpit-first** in its tab bar: 5 tabs
(`home, qa, validation, finance, profile`). The Operations grid on
`/admin/home` now exposes **15 drill-down routes** (was 8 under
Amendment 1):

### Inherited from Amendment 1 (unchanged)

| Surface | Route | Endpoint(s) | Write actions |
|---|---|---|---|
| Users | `/admin/users` | `GET /api/admin/users` | None |
| Team | `/admin/team` | `GET /api/admin/team/capacity` + `/bottlenecks` | None |
| Contracts | `/admin/contracts` | `GET /api/admin/contracts` | None |
| Templates | `/admin/templates` | `GET /api/admin/scope-templates`, `/admin/decomposition/templates` | None |
| Integrations | `/admin/integrations` | `GET /api/integrations/manifest` | None — key rotation stays on web |
| Inbox | `/admin/inbox` | `GET /api/admin/messages/inbox` | None |
| Marketplace | `/admin/marketplace` | `GET /api/marketplace/modules?admin=1` | None |
| Master dashboard | `/admin/master` | `GET /api/admin/master/pipeline` | None |

### Newly legalized under Amendment 2

| Surface | Route | Endpoint(s) | Write actions | Justification |
|---|---|---|---|---|
| Operator Control | `/admin/control` | `GET /api/operator/state`, `/api/operator/decisions` | `POST /api/operator/override` behind `AdminActionSheet` confirmation | Off-desk override during prod incidents (Cat 1) |
| Execution Console | `/admin/execution-console` | `GET /api/admin/execution/stream`, `/admin/execution/why/{module_id}`, `/admin/execution/timeline/{module_id}`, `/admin/execution/universes/{module_id}` | None | Read-only triage of cognition fan-out (Cat 1) |
| Payouts Queue | `/admin/payouts` | `GET /api/payouts-v2/admin/queue`, `/admin/worker/status`, `/admin/batches` | `POST /api/payouts-v2/admin/items/{id}/force-retry`, `POST /admin/items/{id}/dead-letter` behind confirmation sheet | Daemon-level payouts ops (Cat 2) |
| Reconciliation | `/admin/reconciliation` | `GET /api/payouts-v2/reconciliation/summary`, `/runs`, `/divergences` | `POST /api/payouts-v2/reconciliation/divergences/{id}/resolve` behind confirmation sheet | Weekend divergence triage (Cat 3) |
| Portfolio | `/admin/portfolio` | `GET /api/admin/portfolio/risk`, `/admin/pressure/topology` | None | Read-level portfolio risk preview |
| Payout Batch Detail | `/admin/payout-batch/[batchId]` | `GET /api/payouts-v2/admin/batches/{batch_id}` + items | `POST /admin/items/{id}/transition` (limited set, behind sheet) | Deep-link from notifications (Cat 2) |
| Project Detail | `/admin/projects/[id]` | `GET /api/admin/projects/{id}` + child resources | None | Deep-link from inbox / push notifications |

**Total admin Expo surface: 5 cockpit tabs + 15 drill-downs = 20 routes
(plus `_layout.tsx`, which is not a screen).**

This is the entire admin surface allowed on Expo. Adding a 21st route
requires Amendment 3.

## Architectural rules (locked in for the expansion)

Rules 1–5 of Amendment 1 remain in force, with the following sharpenings:

### Rule 1 (sharpened) — No new business logic on Expo

Every endpoint above already existed on the backend prior to this
amendment. The Expo screens are thin presentation layers over those
endpoints. **No backend changes were made or are permitted under this
amendment.** If a future Expo admin screen needs a new endpoint, the
endpoint must ship on web first, observe ≥7 days of stable usage,
THEN become eligible for Expo wiring under a separate change.

### Rule 4 (sharpened) — Narrow-write actions on Expo: explicit allowlist

Amendment 1's rule 4 said "write actions stay on web" with carve-outs
behind `AdminActionSheet`. Under Amendment 2, **the carve-outs are
explicit and bounded**:

| Surface | Allowed Expo write | Reason |
|---|---|---|
| Operator Control | `POST /api/operator/override` (single decision override) | On-call must be able to override mid-incident |
| Payouts Queue | `POST /api/payouts-v2/admin/items/{id}/force-retry` | Recover from transient provider 5xx |
| Payouts Queue | `POST /api/payouts-v2/admin/items/{id}/dead-letter` | Terminate exhausted item, free worker slot |
| Payout Batch Detail | `POST /api/payouts-v2/admin/items/{id}/transition` (allowlist: `failed→cancelled`, `confirmed→settled` only) | Same as above, but per-item context |
| Reconciliation | `POST /api/payouts-v2/reconciliation/divergences/{id}/resolve` | Close a divergence after manual investigation |

**No other writes from Expo admin.** Bulk operations, key rotation,
template authoring, user suspension, payment-rail config, scope-freeze
editing — all stay on web. Period.

### Rule 6 (new) — Confirmation-sheet contract

Every Expo write action above MUST:

- Use `AdminActionSheet` (single component) with the following slots:
  - Title: imperative ("Force retry payout item")
  - Subtitle: object identity ("item_id · developer email · amount")
  - Body: 1–2 sentences of consequence ("This will reset retry counter
    and re-enqueue. If provider still rejects, item will return to
    `failed` after the next attempt.")
  - Confirm button: red, full-width, explicit verb ("Force retry")
  - Cancel button: secondary, always available
- Submit through `useAdminMutation` (uniform pending → success/error
  state via the same toast system as web).
- Idempotent on the backend (every endpoint above is) — double-tap
  resilience is a server property, not a client property.

### Rule 7 (new) — Deep-link discipline

`/admin/payout-batch/[batchId]` and `/admin/projects/[id]` are NOT
in the Operations grid. They are reached only via:

- Notifications (push or in-app inbox) when an event references a
  specific batch / project.
- Drill-down from another admin surface (e.g., Payouts Queue → batch
  row → batch detail).

These deep-link routes have `href: null` in `admin/_layout.tsx` and
do not contribute to the cockpit's signal budget.

## What is still OUT of scope on Expo admin (unchanged from Amendment 1)

- Project kanban drag-and-drop.
- Bulk user / payout / scope template edits.
- Integration key rotation (UI is on Expo; rotation is on web).
- Web Master Dashboard analytics charts (Expo gets the funnel counts only).
- Decomposition template authoring.
- Workflow rule editing.

Additionally, **the following are explicitly OUT under Amendment 2**:

- Scope template authoring or editing (read-only list only).
- Money substrate state inspection beyond the 6 canonical states
  (the divergence observer detail UI stays on web).
- Cognition replay playback (the `seed_replay` boot_replay viewer
  stays on web).
- 2FA admin overrides (must come from a known device → web only).

## Observation window

This amendment is **on probation for 60 days** (Feb 2026 → Apr 2026).
We track:

| Metric | Target | Action if breached |
|---|---|---|
| 401/403 rate on the 22 admin Expo endpoints | ≤ baseline web rate | Hide affected surface behind feature flag |
| Operations grid drill rate (sessions with ≥1 drill / total admin sessions) | ≥ 25% by week 4 | Re-check IA — surfaces may not be discoverable |
| Crash rate on `/admin/*` routes | 0 | Halt rollout, file P0 |
| Confirmation-sheet abort rate (admin opens sheet, then cancels) | 20–60% (healthy hesitation) | If <20% → admins are tapping carelessly, raise friction. If >60% → sheet copy is unclear, rewrite. |
| Push → deep-link → confirm time (P50) | ≤ 90s for force-retry / dead-letter | Investigate path latency |
| On-call MTTR for Cat 1/2/3 incidents | ≤ 50% of pre-Amendment-2 baseline | Revert specific surface; keep Amendment 1 as fallback |

If any signal regresses past tolerance, the affected surface is
hidden by feature flag and a back-out is filed.

## Migration plan (Feb 2026 → Apr 2026)

| Phase | Duration | Scope |
|---|---|---|
| Phase 0 — Spec freeze | 0 days | This document is the spec. No code yet. |
| Phase 1 — Inventory | 1 day | Confirm all 22 endpoints are stable (no churn forecast in next 60 days). Lock contracts. |
| Phase 2 — UI primitives audit | 2 days | Ensure new screens reuse `src/admin/ui.tsx` (`AdminHeader`, `AdminListScreen`, `AdminRow`, `AdminSection`, `AdminActionSheet`). Any drift → reject PR. |
| Phase 3 — Operations grid update | 1 day | Add 7 new grid tiles with the right icons. Order by usage frequency observed in production: Payouts > Execution Console > Reconciliation > Operator Control > Portfolio > deep-links (hidden). |
| Phase 4 — Confirmation-sheet wiring | 3 days | Every write goes through the sheet. Allowlist enforced at the screen level, not at the backend (server is already idempotent). |
| Phase 5 — Observation | 60 days | Track metrics above. No new surfaces accepted during this window. |

## Roll-back path

If Amendment 2 needs to be reverted:

1. Feature flag `expo_admin_amendment_2` = `false` in `runtime/capabilities`.
2. The 7 new tiles disappear from Operations grid.
3. Direct routes still resolve (so push notifications don't break),
   but render a "Available on web admin" stub with a `Linking.openURL`
   button to the web equivalent.
4. Confirmation sheets are short-circuited (write actions disabled).
5. Web admin continues to serve all 22 endpoints unchanged.

Roll-back is **non-destructive** — no data migration, no schema change,
no version bump on the contract bundle.

## Comparison to Amendments 1 & 0

| Aspect | Decision 1 (original) | Amendment 1 (May 19) | Amendment 2 (Feb 2026) |
|---|---|---|---|
| Total admin Expo routes | 5 | 13 | 20 |
| Cockpit tabs | 5 | 5 | 5 |
| Drill-downs from Operations grid | 0 | 8 | 13 |
| Deep-link routes (hidden) | 0 | 0 | 2 |
| Allowed write actions | None | None | 5 (narrow allowlist) |
| Probation window | n/a | 30 days | 60 days |
| Backend changes required | No | No | No |

## Sign-off

This amendment file is the change-log. No separate ticket.

The relationship between Amendments 1 and 2 is **additive**: Amendment
2 grows the surface but inherits all rules of Amendment 1 unless
explicitly sharpened above. If Amendment 1 is ever rolled back,
Amendment 2 must roll back with it (you can't have the new surfaces
without the Operations-grid discipline they sit in).

---

_Recorded: Feb 2026. Predecessors: scope-freeze (May 9), amendment 1 (May 19)._
_File is canonical; if code disagrees, code is wrong._
