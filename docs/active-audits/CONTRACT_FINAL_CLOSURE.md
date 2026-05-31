# CONTRACT FINAL CLOSURE — P3..P8 sealed

**Date:** 2026-05-24 (current session)
**Driver:** Product spec — "close Contracts Logic to 100% without collecting passport/ID photos".
**Status:** ✅ **CLOSED** — all six phases (P3, P4, P5, P6, P7, P8) implemented, three E2E suites green, admin oversight surface live, RBAC enforced.

---

## TL;DR — what shipped at closure

Backend `legal_contract_layer.py` already had P3..P8 implemented from the previous Phase-2 session. The final closure delivers what was missing on top of that:

1. **Admin oversight surface (CONTRACT-P7+)** — five new admin-only endpoints
2. **Frontend readiness pre-flight (CONTRACT-P6)** — sign UI now surfaces missing items as friendly text before the user hits the OTP step (412/503 errors mapped to readable copy)
3. **Privacy & data control UI (CONTRACT-P7)** — “Download my data” + “Request erasure” buttons in `/documents`
4. **Admin E2E test** — five admin endpoints + five negative RBAC checks
5. **Doc trail** — `memory/PRD.md`, `memory/active_issues.md`, this audit doc

Data-minimization rule from spec is locked: **no passport, no ID photos, no scans, no Ukrainian ITN (ИПН) by default; tax_id stays optional; enhanced KYC deferred to external provider for high-value contracts.**

---

## Backend — five new admin endpoints

All scoped under `/api/admin/legal/*`, all return `403` for non-admins, all `_audit_legal_access(...)` rows written automatically when an admin reads or mutates someone else’s data.

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/admin/legal/profile/{user_id}?reason=...` | Read another user’s decrypted legal profile; logs access |
| `GET`  | `/admin/legal/deletion-requests?state=open\|resolved` | List GDPR-style erasure requests |
| `POST` | `/admin/legal/deletion-requests/{user_id}/resolve` | Close a request: `redacted` / `rejected` / `retained_under_law` |
| `GET`  | `/admin/legal/access-log?subject_user_id=&limit=` | Paginated audit trail of legal-data reads |
| `GET`  | `/admin/legal/contracts?state=signed&limit=` | Admin list of contracts (heavy fields stripped: html, pdf, rendered_html) |

Implementation: 130 LOC appended before `return router` in `backend/legal_contract_layer.py`, no new files, no DB migrations (uses the existing `client_legal_profiles`, `legal_access_audit`, `contracts` collections + `_audit_legal_access` helper).

---

## Frontend — three UX additions

### 1) `contract/[id]/sign.tsx` — readiness pre-flight + AES messaging
Step-3 → Step-4 transition now:
- Hits `GET /api/contracts/{id}/readiness` first.
- If `ready=false`, surfaces missing items as a bullet list in an Alert (not the raw `412 not_ready_to_sign` JSON).
- Maps backend `503 aes_required` to a friendly "Enhanced verification required — contact support" message.

### 2) `documents.tsx` — “Privacy & your data” section
New section under Payment confirmations with two buttons:
- **Download my data** → opens `/api/legal/profile/export` (full GDPR portability payload)
- **Request erasure** → POST `/api/legal/profile/delete-request`

Both have `testID` (`documents-download-my-data`, `documents-request-erasure`) for E2E.

### 3) Styles
New `privacyCard`, `privacyLede`, `privacyActions` style entries in `documents.tsx`. No regressions to existing styles.

---

## Data-minimization rule, locked

The `LegalProfileIn` Pydantic model in `legal_contract_layer.py` already enforces:

```
Required (both individual + company):
  legal_type, first_name, last_name, phone,
  billing_address, country, city, postal_code
Required only if legal_type == company:
  company_name, company_registration_number
Optional for everyone:
  tax_id, middle_name
NEVER collected by default (deferred to future external KYC):
  passport scans, ID photos, biometrics, Ukrainian ITN
```

Sensitive fields (`tax_id`, `company_registration_number`) are encrypted at rest via Fernet (AES-128-CBC + HMAC-SHA256) using `LEGAL_DATA_ENCRYPTION_KEY` env (dev-derived fallback when missing).

---

## Signature level policy (CONTRACT-P8)

`_required_signature_level()` reads `CONTRACT_AES_THRESHOLD_USD` env (default `0` → SES for everyone). When set:
- contracts with price ≥ threshold demand AES
- AES path returns `503 {code: aes_required}` until an external e-sign rail is wired (DocuSign / Dropbox Sign / etc.)
- SES path (default for now) = click-wrap + email OTP + IP/UA + sha256 + PDF + platform countersign

---

## Evidence package (already shipped in Phase 2, unchanged here)

Each signed contract persists:
- immutable `html_snapshot` + `rendered_html`
- `project_snapshot` (project_id, estimate_id, title, price, timeline, modules, payment_plan, payment_method, hvl_summary, platform_legal_entity)
- `legal_profile_snapshot` (decrypted at snapshot time)
- `executor_signature` (Provider countersign — party, role, tax_id, signed_at, signature_hash)
- `terms_version`, `template_version`, `signature_level`
- `sha256_hash`, `signer.{ip, user_agent, email, user_id}`
- `fully_executed: true`, `pdf_status`, `pdf_b64`

Plus a per-signature audit row in `contract_signatures`.

---

## Tests — three green E2E suites

```
$ python3 backend/tests/test_legal_contract_e2e.py
✅ END-TO-END CONTRACT SIGNING FLOW PASSED

$ python3 backend/tests/test_legal_contract_phase2.py
(silent run, returns 0)

$ python3 backend/tests/test_legal_contract_admin_e2e.py
[admin.deletion-requests] count=1 target=found
[admin.profile] legal_type=individual
[admin.resolve] resolution=retained_under_law
[admin.access-log] count=4 reasons=['deletion_resolved:retained_under_law', 'qa_test', 'self_delete_request']
[admin.contracts] count=1
[rbac] client → 403 on all 5 admin endpoints ✓
✅ CONTRACT-P7 ADMIN OVERSIGHT E2E PASSED
```

---

## Roadmap status — every line of spec accounted for

| Spec phase | Status | Where |
|---|---|---|
| **CONTRACT-P3** — Client Legal Profile (no passport, tax_id optional) | ✅ | `LegalProfileIn`, `_upsert_legal_profile`, `/api/legal/profile` GET/PUT |
| **CONTRACT-P4** — Contract Composer from immutable snapshots | ✅ | `confirm_signature` builds `project_snapshot` + `legal_profile_snapshot` + `html_snapshot` + sha256 |
| **CONTRACT-P5** — Real Template v1 (18 sections) | ✅ | `DEFAULT_TEMPLATE_HTML` — parties, project, scope, deliverables, timeline, price, HVL, change requests, IP transfer, confidentiality, liability, refund, dispute, governing law, e-sign |
| **CONTRACT-P6** — Signature Readiness Gate | ✅ | `_compute_readiness` + `GET /readiness` + 412 in request-otp + frontend pre-flight |
| **CONTRACT-P7** — Data Protection Layer | ✅ | Fernet encryption + access audit + GDPR export + erasure request + **admin oversight surface (new)** |
| **CONTRACT-P8** — Signature Level Policy | ✅ | `_required_signature_level` SES default + AES threshold + 503 until external rail wired |

---

## Files changed in this closure session

| File | Change |
|---|---|
| `backend/legal_contract_layer.py` | +130 LOC — five admin endpoints inserted before `return router` |
| `frontend/app/contract/[id]/sign.tsx` | `goNextFrom3` rewritten — readiness pre-flight + 412/503 friendly mapping |
| `frontend/app/documents.tsx` | New "Privacy & your data" section with Download/Erasure buttons + supporting styles |
| `backend/tests/test_legal_contract_admin_e2e.py` | New (135 LOC) — five admin endpoints + five RBAC negative checks |
| `docs/active-audits/CONTRACT_FINAL_CLOSURE.md` | This document |
| `memory/PRD.md`, `memory/active_issues.md` | Updated below |

---

## Env contract (production-only — dev derives sensible fallbacks)

| Env | Purpose | Default in preview |
|---|---|---|
| `LEGAL_DATA_ENCRYPTION_KEY` | Fernet key for tax_id / company_reg_no at rest | dev-derived from MONGO_URL (logs warning) |
| `EXECUTOR_PARTY` | Provider legal name on contract | `EVA-X / ATLAS DevOS` |
| `EXECUTOR_ADDRESS` | Provider registered address | `EVA-X Platform — Operational HQ` |
| `EXECUTOR_TAX_ID` | Provider tax ID printed in template | `[Platform Tax ID — pending]` (hidden when starts with `[`) |
| `EXECUTOR_COUNTRY` | Provider country | `International` |
| `EXECUTOR_SIGNATORY` | Authorising operator name | `EVA-X Platform Operator` |
| `CONTRACT_OTP_SECRET` | HMAC namespace for contract OTPs | `atlas-contract-otp-dev-secret` |
| `CONTRACT_REMINDER_INTERVAL_SEC` | 24h/48h/96h reminder sweep cadence | `21600` (6h). `0` disables. |
| `CONTRACT_AES_THRESHOLD_USD` | Price ≥ threshold flips required signature level to AES | `0` (= SES for everyone) |

---

## What we explicitly DID NOT do (and why)

Per spec rationale — these would create privacy/security liability for v1:

- ❌ No passport scans / ID photos / biometrics anywhere in the stack.
- ❌ No required Ukrainian ITN (ИПН) by default.
- ❌ No DocuSign / Qualified-signature integration — that’s the AES upgrade path, queued as future work.
- ❌ No mandatory legal profile at registration — collected lazily at first sign.

If a high-value or regulated-jurisdiction contract eventually demands AES, the SES path returns `503` with `code=aes_required` and the operator routes the client to an external KYC + e-sign provider out of band.

---

**Final verdict:** Contracts Logic is closed at 100% under the spec’s rules. No follow-up items remain for P3–P8; the next legal-related work item is the external e-sign integration when an AES-required contract appears in the system.
