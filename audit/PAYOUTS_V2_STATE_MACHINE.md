# Payouts V2 — State Machine Contract

**Status:** 📋 CONTRACT DOCUMENT — operational truth for the payouts-v2 substrate.
**Date:** 2026-Feb
**Audience:** product, finance ops, on-call admins, future engineering touching payouts.
**Predecessors:** `MONEY_STATE_MACHINE.md` (D-1…D-14 developer states),
`MONEY_LEDGER_EVENTS.md` (substrate-side events).
**Code anchors:** `backend/payouts_v2.py` (state table, transition guards),
`backend/payouts_v2_api.py` (23 endpoints), `backend/payouts_v2_worker.py`,
`backend/payouts_v2_reconciler.py`.

This document is the **human-facing operational contract** of the
payouts-v2 substrate. It does NOT describe MongoDB schemas. It
describes what truth the platform owes the developer (the money
recipient) and the admin (the operator) at each moment of the payout
lifecycle.

If a future change to the payouts-v2 code would force a developer or
admin to experience a state not described here, that change is wrong
— not the document.

---

## §1. Operating principle

> **A payout is not a single API call. It is a chain of state
> transitions, each one observable, each one rollback-able where
> required by physics, each one explicit about whose hands the money
> is in.**

The pre-V2 payouts surface treated a payout as an atomic admin
action. V2 treats a payout as a **state-machine-driven workflow**
where:

- The developer always knows what state their money is in.
- The admin always has a hand on the wheel for items that need it,
  and the worker handles the rest autonomously.
- Reconciliation runs continuously, not as a quarterly batch ritual.

---

## §2. Item states

A **payout item** is a single, indivisible unit of money owed to a
single developer for a single earning event. One item = one money
flight. Items cannot be split. Items cannot be merged. Items can be
**cancelled and replaced** by a new item (with new `item_id`) — this
preserves auditability.

| State | What developer thinks | What platform must guarantee |
|---|---|---|
| `queued` | "My approved earnings are queued for the next payout cycle." | The item exists, has an amount, has a rail, is visible in `/api/payouts-v2/developer/items`. No money has moved from the substrate. Worker has not yet picked it up. |
| `initiated` | "The platform is preparing to send my money." | Worker has acquired a lease on the item. Provider API call has not yet been made. If the worker crashes here, the reaper returns the item to `queued` within the lease TTL. |
| `in_flight` | "My money is moving through the payment rail." | Provider API call succeeded, an external transaction reference exists, but settlement has not been confirmed. The worker is no longer holding the lease — the webhook does. |
| `confirmed` | "The payment processor confirmed delivery." | A webhook from the provider (Stripe / PayPal) has acknowledged settlement. `pending_withdrawal` on the developer's wallet is reduced. Internal accounting is complete. |
| `settled` | "Money is in my external account." | The processor's *settled* event has been received OR the mock-advancer (dev environments) has marked the item terminally paid. This is the developer's "money is mine" state. |
| `reconciled` | "Books match. This payout is permanently closed." | The reconciler has compared substrate state vs provider state vs ledger state in the last 30 days and found zero divergence on this item. No further changes possible (except a `disputed` event, which is rare). |
| `failed` | "The payment didn't go through. The platform will retry or escalate." | Either a provider error returned, or a retry budget was exhausted, or the item was force-retried by an admin and that retry also failed. The amount is **still locked** in `pending_withdrawal` — money is not lost. Either an automatic retry will fire, or an admin will dead-letter the item (which returns money to `available_balance`). |
| `returned` | "The payment was sent but the receiving end rejected it (closed account, wrong rail, etc.)." | A return webhook has been received. The amount has been credited back to `available_balance`. The developer is notified. They can re-initiate the payout from a corrected payment profile. |
| `disputed` | "Someone (developer, admin, or provider) flagged this payout as wrong." | A dispute event has been created. The item is frozen — no further state transitions except `→ reconciled` after manual resolution. Money does not move until dispute is resolved. |
| `cancelled` | "This payout was cancelled before it left the platform." | Item never reached `in_flight`. Money is back in `available_balance`. Audit trail records who cancelled and why. |

### Item state diagram (allowed transitions only)

```
                       ┌──────────────────────────────────────────┐
                       │                                          ▼
                   ┌───┴────┐                              ┌──────────┐
        ┌─────────►│ queued │──[cancel]──────────────────► │ cancelled│ (terminal)
        │          └───┬────┘                              └──────────┘
        │              │                                          
        │           [worker_acquire]                          
        │              ▼                                          
        │       ┌─────────────┐    [provider_5xx,retry_budget>0]
        │       │  initiated  │◄────────────────────────────┐    
        │       └──────┬──────┘                             │    
   [reap]               │     ┌──[fail]───►┌───────────┐    │    
        │        [provider_ok]│             │  failed   │────┤    
        │              ▼     ▼             └─────┬─────┘    │    
        │       ┌─────────────┐  ┌──[dead_letter]┘          │    
        │       │  in_flight  │  │ (admin)                  │    
        │       └──────┬──────┘  └────► to cancelled        │    
        │              │                                    │    
        │       [webhook:settled]                           │    
        │              ▼                                          
        │       ┌─────────────┐  [return_webhook]    ┌──────────┐
        │       │  confirmed  │──────────────────────►│ returned │ (terminal,
        │       └──────┬──────┘                       └──────────┘  money back)
        │              │
        │       [provider_settled]
        │              ▼
        │       ┌─────────────┐  [dispute]    ┌──────────┐
        └──────►│   settled   │──────────────►│ disputed │ (frozen)
                └──────┬──────┘               └────┬─────┘
                       │                           │
                [reconciler_run]                   │ (manual resolution)
                       ▼                           │
                ┌──────────────┐                   │
                │  reconciled  │◄──────────────────┘
                └──────────────┘ (terminal)
```

Allowed transitions are enforced by `payouts_v2._ITEM_TRANSITIONS`.
Any illegal transition raises `ValueError`. **The state table is the
contract. The code mirrors the table, not the other way around.**

### Terminal vs non-terminal

| Terminal (no further transitions) | Non-terminal |
|---|---|
| `settled` (but allows `→ reconciled` and `→ disputed`) | `queued` |
| `reconciled` (allows `→ disputed`) | `initiated` |
| `failed` (new attempt = new item) | `in_flight` |
| `returned` | `confirmed` |
| `cancelled` | `disputed` (frozen) |

---

## §3. Batch states

A **batch** is a group of items released together for operational
convenience. Batching is **not** mandatory — items can flow through
the state machine individually. Batches exist primarily to give the
admin a single approve / release / cancel surface.

| State | What admin thinks | What platform must guarantee |
|---|---|---|
| `proposed` | "The scheduler proposed a batch. I haven't approved it yet." | All items in the batch are in `queued`. Approving the batch does NOT move items; releasing the batch does. |
| `released` | "I authorized this batch. The worker can pick items up." | Items in the batch are still in `queued` but are now eligible for worker acquisition. The release timestamp is recorded. |
| `cancelled` | "I cancelled this batch before it released. None of these items moved." | All items return to `queued` (eligible for the next batch). No money moved. |
| `closed` | "All items in this batch reached a terminal state." | The batch is archived. The next-batch proposal cycle does NOT re-consider closed batches. |

### Batch state diagram

```
   ┌────────────┐  [release]  ┌──────────┐  [all_items_terminal]  ┌─────────┐
   │  proposed  │─────────────► released │───────────────────────►│ closed  │
   └─────┬──────┘             └──────────┘                        └─────────┘
         │
         │ [cancel]
         ▼
   ┌─────────────┐
   │  cancelled  │
   └─────────────┘
```

A batch in `released` cannot be cancelled — once items can be picked
up by the worker, the batch is "live" and the only forward path is
through item-level closures.

---

## §4. Actors and their hands on the wheel

### §4.1. The developer

The developer never directly touches a payout item state. They can:

- View their items (`GET /api/payouts-v2/developer/items`).
- Update their payment profile (`PUT /api/payouts-v2/developer/payment-profile`),
  which only affects FUTURE items (existing items keep their rail snapshot).
- Initiate Stripe onboarding (`POST /api/payouts-v2/developer/stripe/onboarding`),
  which is a precondition for items with rail = `stripe_connect`.

They can never:

- Cancel an item (admin-only).
- Force-retry an item (admin-only).
- Move money between rails post-creation.

### §4.2. The scheduler (autonomous daemon, every 900s)

Reads `pending_summary` of approved earnings. Decides whether to
propose a new batch based on (a) accumulated amount, (b) time since
last release, (c) developer count threshold. Outputs:

- A `batch` document in state `proposed`.
- Items in that batch are created from approved earnings and start
  in `queued`.

The scheduler does NOT release batches. That is an admin decision
(or, in `auto-release` deployments, an admin-configured policy).

Scheduler log line:
```
PAY-V2 scheduler cycle: {'batch_id': 'batchv2_…', 'empty': bool,
 'totals': {'developers': N, 'earnings': M, 'amount': X}}
```

### §4.3. The worker (autonomous daemon, continuous loop)

Picks up items in `queued` whose batch is `released`. Acquires a
distributed lease (TTL = 5 min by default). Calls the provider API.
Transitions item `queued → initiated → in_flight`.

If the provider returns 2xx with a transaction reference → item moves
to `in_flight` and the worker releases the lease. The webhook (next
section) takes over.

If the provider returns 5xx → worker increments retry counter, sets
`next_attempt_at = now + exp_backoff`. If retry budget is not
exhausted → item back to `queued`. If exhausted → item to `failed`.

If the provider returns 4xx (client error, e.g., invalid rail) →
item directly to `failed` (no retries for client errors).

Worker log line:
```
PAY-V2 worker: drained N items in M ms (ok=X, retry=Y, failed=Z)
```

### §4.4. The reaper (autonomous daemon, every 60s)

Scans for items in `initiated` or `in_flight` where the worker's
lease has expired (worker crashed or hung). Returns them to `queued`
for re-acquisition by another worker instance.

The reaper is the answer to the question "what if the worker died
mid-flight?". Without the reaper, items would be stuck. With the
reaper, the system is **at-least-once delivery with idempotent
provider keys** (every provider call carries a stable `idempotency_key`
so retries don't double-pay).

### §4.5. The mock-advancer (autonomous daemon, dev environments only)

When `INTEGRATIONS_LIVE_ENABLED=0` (mock mode), there are no real
provider webhooks. The mock-advancer simulates them: items in
`in_flight` for more than 30 seconds are moved to `confirmed`, then
to `settled` after another 30 seconds. Random failure injection
(configurable rate) moves a fraction to `failed` or `returned`.

This is the substrate's answer to "we cannot run real payouts in
preview" — we run synthetic ones that traverse the same state machine.

### §4.6. The reconciler (autonomous daemon, every 1800s)

Compares three sources of truth:

1. **Substrate state:** what `payouts_v2.items` says.
2. **Provider state:** what Stripe / PayPal API returns for the
   same set of transaction references (sampled, not exhaustive).
3. **Ledger state:** what `money_ledger_events` records for the
   same items.

Outputs:

- A `reconciliation_run` document with `scanned`, `discrepancies`,
  `by_severity {info, warning, critical}`, `duration_ms`.
- One `divergence` document per discrepancy, with a severity, a
  proposed resolution, and admin endpoints to confirm or override.

Reconciler log line:
```
RECONCILE run=recon_XXXXXXXX scanned=N discrepancies=M
 by_severity={'info': X, 'warning': Y, 'critical': Z} duration_ms=K
```

### §4.7. The admin

The admin has these specific levers (each lever is a stated-purpose
endpoint, not a general DB poke):

| Lever | Endpoint | When to pull |
|---|---|---|
| Approve / release batch | `POST /api/payouts-v2/admin/batches/{batch_id}/release` | After confirming the proposed batch matches the pending summary |
| Cancel a `proposed` batch | `POST /api/payouts-v2/admin/batches/{batch_id}/cancel` | Wrong threshold, off-cycle, items need re-validation |
| Force retry a failed item | `POST /api/payouts-v2/admin/items/{item_id}/force-retry` | Provider 5xx exhausted retries but you know the provider is back up |
| Dead-letter an item | `POST /api/payouts-v2/admin/items/{item_id}/dead-letter` | Permanent failure — terminate the item, return money to `available_balance`, developer can re-initiate from corrected profile |
| Drain the queue once | `POST /api/payouts-v2/admin/worker/drain-once` | Manual one-shot worker pass — diagnostic, not normal ops |
| Transition an item explicitly | `POST /api/payouts-v2/admin/items/{item_id}/transition` | Operational override — RARE. Only allowed for transitions in `_ITEM_TRANSITIONS`. |
| Run reconciliation on demand | `POST /api/payouts-v2/reconciliation/run` | After known provider outage, to catch lingering divergences |
| Resolve a divergence | `POST /api/payouts-v2/reconciliation/divergences/{id}/resolve` | After manual investigation of why substrate ≠ provider |

**The admin cannot:**

- Move money outside the state machine.
- Change an item's amount post-creation.
- Bypass the idempotency key (worker re-enqueue is the right tool).
- Approve a `released` batch's cancellation (forward-only after release).

---

## §5. Endpoint surface (23 endpoints)

### Admin (15 endpoints)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/payouts-v2/admin/queue` | Queue health (counts by status, rail). Powers admin payouts dashboard. |
| GET | `/api/payouts-v2/admin/batches/{batch_id}` | Single batch detail + items. |
| GET | `/api/payouts-v2/admin/items/{item_id}` | Single item detail + state history + provider refs. |
| POST | `/api/payouts-v2/admin/batches/propose` | Force a scheduler cycle now (diagnostic). |
| POST | `/api/payouts-v2/admin/batches/{batch_id}/release` | Authorize a `proposed` batch. |
| POST | `/api/payouts-v2/admin/batches/{batch_id}/cancel` | Cancel a `proposed` batch. |
| POST | `/api/payouts-v2/admin/items/{item_id}/transition` | Explicit operational transition (allowed targets only). |
| POST | `/api/payouts-v2/admin/items/{item_id}/force-retry` | Reset retry counter, re-enqueue from `failed`. |
| POST | `/api/payouts-v2/admin/items/{item_id}/dead-letter` | Terminate item, return money to wallet. |
| GET | `/api/payouts-v2/admin/worker/status` | Worker liveness, last drain, lease counts. |
| POST | `/api/payouts-v2/admin/worker/drain-once` | One-shot worker pass. |
| GET | `/api/payouts-v2/reconciliation/summary` | Last N runs, divergence counts by severity. |
| POST | `/api/payouts-v2/reconciliation/run` | Force a reconciliation run now. |
| GET | `/api/payouts-v2/reconciliation/runs` | Run history with pagination. |
| GET | `/api/payouts-v2/reconciliation/divergences` | Open divergences. |
| POST | `/api/payouts-v2/reconciliation/divergences/{id}/resolve` | Mark divergence resolved with reason. |

### Developer (3 endpoints)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/payouts-v2/developer/payment-profile` | Read current payment rail config. |
| PUT | `/api/payouts-v2/developer/payment-profile` | Update payment rail (affects future items only). |
| GET | `/api/payouts-v2/developer/items` | List developer's own items (paginated). |
| POST | `/api/payouts-v2/developer/stripe/onboarding` | Begin Stripe Connect onboarding flow. |

### System (4 endpoints)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/payouts-v2/webhooks/stripe` | Receive Stripe webhooks (idempotent on event_id). |
| POST | `/api/payouts-v2/webhooks/paypal` | Receive PayPal webhooks. |
| GET | `/api/payouts-v2/_provider/state` | Provider availability snapshot (live/mock/dormant). |

Total: **23 endpoints** (matches OpenAPI count under `payouts-v2/*` prefix).

---

## §6. Forbidden combinations

If any of these are observed in production, the substrate is wrong
— file an incident immediately.

| Forbidden | Why |
|---|---|
| Item in `settled` but `pending_withdrawal` on developer wallet > 0 for this item | Money should have left `pending_withdrawal` when the item hit `confirmed`. |
| Item in `failed` but money already deducted from `available_balance` | `failed` means money never left — it's still owed. Deduction without delivery is theft. |
| Item in `in_flight` for > 7 days without a webhook | Either the provider lost the transaction, or the webhook signature is broken. Reconciler must catch this within 24h. |
| Two items with same `idempotency_key` but different `provider_ref` | Idempotency violation — the provider has been called twice with the same key but produced different transactions. Investigate before any further releases. |
| Batch in `released` with all items in terminal states but batch still `released` | Worker is behind on the "all-items-terminal → batch closed" sweep. Manually close the batch and check the close-sweep daemon. |
| Reconciler discrepancy `critical` and unresolved > 24h | Manual escalation. Either resolve the divergence or open an incident. |
| `transition` endpoint called for a target not in `_ITEM_TRANSITIONS[current]` | The contract enforces this — if it happened, the contract was bypassed (direct DB write). Audit the actor. |

---

## §7. Money conservation laws

These hold for every state of the system:

1. **Per-developer:** `available_balance + pending_withdrawal + sum(money in in-flight items) = sum(all approved earnings) - withdrawn_lifetime`.
2. **Per-item:** Once created, an item's `amount` is immutable. The amount can move *between buckets* (queued/in_flight/settled/returned) but the total of all items for a developer at any time is the algebraic invariant in §7.1.
3. **Per-batch:** `sum(items in batch) = batch.declared_total`. Drift here is a `critical` divergence.
4. **Cross-substrate:** `sum(payouts-v2 items in `settled` for developer X) = sum(money_ledger_events with kind=payout_settled for developer X)`. The reconciler verifies this; mismatches surface as `warning` divergences.

If any of these break under load, the substrate has a bug **even
if no money has been lost yet** — because the invariant is the
defense against future money loss.

---

## §8. Observation and SLOs

| Signal | SLO | Source |
|---|---|---|
| Worker queue drain time (P50) | ≤ 60 s from `released` to first `in_flight` | `worker_status.last_drain_ms` |
| Webhook → `confirmed` lag (P95) | ≤ 30 s | webhook timestamps vs item transitions |
| `confirmed` → `settled` lag (P95) | ≤ provider SLA (Stripe: 2 business days; PayPal: same-day) | provider settlement events |
| Reconciler discrepancy rate (per 1000 items) | < 1.0 `warning`, 0 `critical` | reconciler run logs |
| Force-retry success rate | ≥ 70% | retry → settled within 24h |
| Dead-letter rate (per 1000 items) | < 5 | terminal `cancelled` via dead-letter |
| Admin write action latency (P95) | ≤ 1.5 s for confirmation sheet roundtrip | API timing |

---

## §9. Relationship to MONEY_STATE_MACHINE.md

The Money State Machine (D-1…D-14) is the **developer's lived
experience**. Payouts V2 is the **substrate that powers states
D-8…D-12** (withdrawal requested → withdrawal paid / rejected /
returned).

| Money state (developer perspective) | Payouts V2 item state | Notes |
|---|---|---|
| D-8 Withdrawal requested | `queued` | Item exists in queue, money locked in `pending_withdrawal`. |
| D-9 Pending admin decision | `queued` (batch=`proposed`) | Awaiting batch release. |
| D-10 Approved, not yet paid | `queued` (batch=`released`) → `initiated` → `in_flight` | Worker has it / provider has it. |
| D-11 Withdrawal paid | `settled` (eventually `reconciled`) | Money left platform. |
| D-12 Withdrawal rejected | `failed` (then `cancelled` via dead-letter) OR `returned` | Money back to `available_balance`. |

If a developer ever sees a D-state that doesn't map to one of the
item states above, the surface is wrong — fix the surface, not the
substrate.

---

## §10. Roll-out posture

This is the **operational truth** of payouts-v2 as deployed today.
The substrate is feature-complete. The contract is **closed for
changes** without an explicit revision of this document.

Open work tracked separately:

- **Settlement provider expansion** (currently: Stripe Connect,
  PayPal, mock). Adding a new rail requires a new section in §4
  describing its webhook behaviour and any state-specific quirks.
- **Multi-currency** (currently: USD only). The state machine is
  currency-agnostic; multi-currency is purely a settlement rail
  concern (different idempotency keys per currency).
- **Operator-side analytics** (admin payouts dashboard charts):
  consumes only `GET` endpoints from §5, no new substrate concerns.

---

_Recorded: Feb 2026. Predecessors: MONEY_STATE_MACHINE.md (May 2026),_
_MONEY_LEDGER_EVENTS.md._
_If code disagrees with this contract, code is wrong. If a feature_
_would force a state not in §2/§3, the feature is wrong._
