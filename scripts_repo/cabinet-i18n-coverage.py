#!/usr/bin/env python3
"""
Cabinet i18n coverage audit.

Walks the TARGETS list (98 cabinet pages under /app/web/src/pages/), counts
`tByEn(...)` invocations vs probable hardcoded English JSX text nodes, and
emits a markdown report to /app/audit/CABINET_I18N_COVERAGE_<date>.md.

Heuristic for "hardcoded" candidates:
  - JSX text node `> Some Text <` where the content starts with an uppercase
    letter, is 4–80 chars long, contains at least one lowercase letter
    (filters tech labels like SEQ-01, USE.STARTUP, STACK.CORE), and is not
    purely punctuation.
  - The reported number is a SIGNAL, not a ground truth — false positives
    exist (component prop names that look like text, etc.) and false
    negatives exist (template literals, attr-only labels). Use it to triage.

Iterations:
  - run #1: produce the file at HEAD and triage top-20 offenders manually.
  - run #2: after a translation sweep, re-run and verify hardcoded count
    decreased.

Exit code: 0 always. The script is observational only.
"""
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PAGES_DIR = Path('/app/web/src/pages')
DICT_FILE = Path('/app/web/src/i18n/dictionary.js')
OUT_DIR = Path('/app/audit')

# TARGETS: explicit allowlist of cabinet page files. Built from the full ls of
# /app/web/src/pages/ (excludes legacy/test/_archive files if present).
TARGETS = sorted([
    'AcceptanceQueue.js',
    'AdminDeliverableBuilder.js',
    'AdminDeveloperProfile.js',
    'AdminEarningsControl.js',
    'AdminExecutionIntelligence.js',
    'AdminFinancialsPage.js',
    'AdminIntegrationsPage.js',
    'AdminLeadsPage.js',
    'AdminLegalSettings.js',
    'AdminLoginPage.js',
    'AdminMarketplaceQuality.js',
    'AdminPaymentsPage.js',
    'AdminPayoutBatchDetail.js',
    'AdminPayoutsQueue.js',
    'AdminPressureTopology.js',
    'AdminPricingCalibration.js',
    'AdminPricingConfigPanel.js',
    'AdminProjectReprice.js',
    'AdminQAPage.js',
    'AdminReconciliation.js',
    'AdminSystemUsers.js',
    'AdminTeamPanel.js',
    'AdminTemplatesPage.js',
    'AdminUsersPage.js',
    'AdminV2Dashboard.js',
    'AdminV2Finance.js',
    'AdminV2Portfolio.js',
    'AdminV2Profile.js',
    'AdminV2System.js',
    'AdminV2Team.js',
    'AdminV2Workflow.js',
    'AdminValidationPage.js',
    'AdminWithdrawalsPage.js',
    'BuilderAuthPage.js',
    'ClientAuthPage.js',
    'ClientBillingOS.js',
    'ClientCabinet.js',
    'ClientContractPage.js',
    'ClientCosts.js',
    'ClientDashboardOS.js',
    'ClientDeliverablePage.js',
    'ClientDocumentsPage.js',
    'ClientEstimatePage.js',
    'ClientHub.js',
    'ClientLeaderboardPage.js',
    'ClientOperator.js',
    'ClientProfilePage.js',
    'ClientProjectPage.js',
    'ClientProjectWorkspaceOS.js',
    'ClientProjects.js',
    'ClientReferralPage.js',
    'ClientSupport.js',
    'ClientTransparency.js',
    'ClientVersionsPage.js',
    'ClientWorkspace.js',
    'ContractSignEvidencePage.js',
    'CreateModuleDominance.js',
    'DeliverableBuilder.js',
    'DescribeFlow.js',
    'DevWork.js',
])

# Extend with the rest discovered at runtime
def discover_extra():
    if not PAGES_DIR.exists():
        return []
    existing = set(TARGETS)
    extra = []
    for f in sorted(os.listdir(PAGES_DIR)):
        if f.endswith('.js') and f not in existing:
            extra.append(f)
    return extra


TBYEN_RE = re.compile(r'tByEn\s*\(')
# JSX text-node heuristic
JSX_TEXT_RE = re.compile(r'>\s*([A-Za-z][A-Za-z0-9 ,.:!?\'\-]{3,80})\s*<')
TECH_LABEL_RE = re.compile(r'^[A-Z0-9 _\-.]+$')  # all-caps labels (SEQ-01, USE.STARTUP)
HAS_LOWER_RE = re.compile(r'[a-z]')


def scan_file(path: Path):
    try:
        c = path.read_text()
    except Exception:
        return {'tbyen': 0, 'hardcoded': [], 'lines': 0}
    tbyen = len(TBYEN_RE.findall(c))
    candidates = JSX_TEXT_RE.findall(c)
    hardcoded = []
    for s in candidates:
        s = s.strip()
        if not s:
            continue
        if TECH_LABEL_RE.match(s):
            continue
        if not HAS_LOWER_RE.search(s):
            continue
        # filter obvious component/prop noise
        if s.startswith('//'):
            continue
        hardcoded.append(s)
    # de-dup preserving order
    seen = set()
    uniq = []
    for s in hardcoded:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return {'tbyen': tbyen, 'hardcoded': uniq, 'lines': c.count('\n') + 1}


def load_dict_keys():
    """Quick parse of dictionary.js to count en / uk key parity."""
    if not DICT_FILE.exists():
        return {'en': 0, 'uk': 0}
    c = DICT_FILE.read_text()
    en_keys = set(re.findall(r"^\s*'([^']+)':", c[:c.find('const uk = {')] if 'const uk = {' in c else c, re.M))
    uk_block = ''
    m = re.search(r'const uk = \{', c)
    if m:
        end = c.find('export const DICTIONARY', m.end())
        uk_block = c[m.end():end if end > 0 else None]
    uk_keys = set(re.findall(r"^\s*'([^']+)':", uk_block, re.M))
    return {'en': len(en_keys), 'uk': len(uk_keys), 'missing_in_uk': sorted(en_keys - uk_keys)[:30]}


def main():
    extra = discover_extra()
    all_targets = TARGETS + extra
    rows = []
    total_tbyen = total_hardcoded = 0
    for fname in all_targets:
        path = PAGES_DIR / fname
        if not path.exists():
            rows.append({'file': fname, 'status': 'MISSING', 'tbyen': 0, 'hardcoded_n': 0, 'hardcoded': []})
            continue
        r = scan_file(path)
        rows.append({
            'file': fname,
            'status': 'OK',
            'tbyen': r['tbyen'],
            'hardcoded_n': len(r['hardcoded']),
            'hardcoded': r['hardcoded'][:6],  # top-6 examples
            'lines': r['lines'],
        })
        total_tbyen += r['tbyen']
        total_hardcoded += len(r['hardcoded'])

    dict_stats = load_dict_keys()

    rows.sort(key=lambda r: (-(r['hardcoded_n']), -r['tbyen']))

    date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    out_path = OUT_DIR / f'CABINET_I18N_COVERAGE_{date}.md'
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    lines = []
    lines.append(f'# Cabinet i18n Coverage — {date}')
    lines.append('')
    lines.append(f'**Scope:** {len(all_targets)} cabinet pages under `/app/web/src/pages/` '
                 f'(TARGETS={len(TARGETS)} explicit + {len(extra)} auto-discovered).')
    lines.append('')
    lines.append('## Summary')
    lines.append('')
    lines.append(f'- Total `tByEn(...)` calls: **{total_tbyen}**')
    lines.append(f'- Total probable hardcoded EN JSX text nodes: **~{total_hardcoded}**')
    lines.append(f'- Dictionary EN keys: **{dict_stats["en"]}**')
    lines.append(f'- Dictionary UK keys: **{dict_stats["uk"]}**')
    if dict_stats.get('missing_in_uk'):
        lines.append(f'- Missing in UK (first 30): `{", ".join(dict_stats["missing_in_uk"])}`')
    lines.append('')
    lines.append('Heuristic: a "hardcoded" JSX text node is `>...<` content that '
                 'starts with a letter, has 4–80 chars, contains at least one lowercase, '
                 'and is not an all-caps tech label. False positives expected; use this to triage.')
    lines.append('')
    lines.append('## Top offenders (most probable hardcoded EN)')
    lines.append('')
    lines.append('| Rank | File | tByEn | Hardcoded≈ | Lines |')
    lines.append('|------|------|------:|----------:|-----:|')
    for i, r in enumerate(rows[:30], 1):
        lines.append(f'| {i} | `{r["file"]}` | {r["tbyen"]} | {r["hardcoded_n"]} | {r.get("lines","-")} |')
    lines.append('')
    lines.append('## Per-file detail (full list)')
    lines.append('')
    for r in rows:
        lines.append(f'### `{r["file"]}` — tByEn={r["tbyen"]} hardcoded≈{r["hardcoded_n"]}')
        if r.get('hardcoded'):
            lines.append('')
            for s in r['hardcoded']:
                lines.append(f'- `{s}`')
            lines.append('')

    out_path.write_text('\n'.join(lines) + '\n')
    print(f'Wrote {out_path}')
    print(f'Targets: {len(all_targets)}  tByEn={total_tbyen}  hardcoded≈{total_hardcoded}')
    print(f'Dict: en={dict_stats["en"]} uk={dict_stats["uk"]}')


if __name__ == '__main__':
    main()
