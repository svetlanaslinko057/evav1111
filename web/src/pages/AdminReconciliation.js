/**
 * PAY-V2-P4 / P5 — Reconciliation Dashboard (divergence drill-down).
 *
 * Backend contract:
 *   • GET  /api/payouts-v2/reconciliation/summary
 *   • GET  /api/payouts-v2/reconciliation/runs?limit=N
 *   • GET  /api/payouts-v2/reconciliation/divergences?state=&severity=&item_id=&limit=N
 *   • POST /api/payouts-v2/reconciliation/run                  (body: {window_minutes})
 *   • POST /api/payouts-v2/reconciliation/divergences/{id}/resolve
 *           body: {resolution, note}  (accepted|rejected|manual_fixed|retained_under_law)
 *
 * Authority rule (WEB-P4):
 *   This page does ZERO client-side aggregation. Counters come from /summary,
 *   lists from /divergences and /runs. No `.reduce` / `.filter` over rows
 *   to produce totals on screen.
 *
 * Surface:
 *   • Mode + last-run strip
 *   • Severity tiles (Critical / Warning / Info / Total) — from /summary
 *   • Filter bar: state (open/resolved/all) + severity (all/critical/warning/info) + item_id
 *   • Divergence table — drill-down, resolve action
 *   • Recent runs table — audit trail
 */
import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { runtime } from '@/runtime';
import {
  AlertTriangle, RefreshCw, PlayCircle, Loader2, CheckCircle2,
  Activity, ExternalLink, Filter, ShieldCheck, ShieldAlert, Info as InfoIcon,
} from 'lucide-react';

const SEVERITY_TONES = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

const RESOLUTION_OPTIONS = [
  { value: 'accepted',            label: 'Accepted (no action)' },
  { value: 'manual_fixed',        label: 'Manual fix applied' },
  { value: 'rejected',            label: 'Rejected (not a divergence)' },
  { value: 'retained_under_law',  label: 'Retained under law' },
];

function fmtRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function fmtMoney(n, c = 'USD') {
  if (n == null) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function ToneBadge({ tone, children }) {
  const { tByEn } = useLang();
  const map = {
    success:  { bg: 'var(--token-success-tint)', fg: 'var(--token-success)', bd: 'var(--token-success-border)' },
    info:     { bg: 'var(--token-info-tint)',    fg: 'var(--token-info)',    bd: 'var(--token-info-border)' },
    danger:   { bg: 'var(--token-danger-tint)',  fg: 'var(--token-danger)',  bd: 'var(--token-danger-border)' },
    warning:  { bg: 'var(--token-warning-tint)', fg: 'var(--token-warning)', bd: 'var(--token-warning-border)' },
    neutral:  { bg: 'var(--token-surface-elevated)', fg: 'var(--token-primary)', bd: 'var(--token-border)' },
    muted:    { bg: 'transparent', fg: 'var(--token-muted)', bd: 'var(--token-border)' },
  };
  const s = map[tone] || map.neutral;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}
    >
      {children}
    </span>
  );
}

function SeverityTile({ label, value, tone, icon, testid }) {
  const map = {
    danger:  { fg: 'var(--token-danger)',  bd: 'var(--token-danger-border)' },
    warning: { fg: 'var(--token-warning)', bd: 'var(--token-warning-border)' },
    info:    { fg: 'var(--token-info)',    bd: 'var(--token-info-border)' },
    neutral: { fg: 'var(--token-primary)', bd: 'var(--token-border)' },
    muted:   { fg: 'var(--token-muted)',   bd: 'var(--token-border)' },
  };
  const s = map[tone] || map.neutral;
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'var(--token-surface-elevated)', border: `1px solid ${s.bd}` }}
      data-testid={testid}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-token-muted">{label}</span>
        <span style={{ color: s.fg }}>{icon}</span>
      </div>
      <div className="text-2xl font-semibold mt-1" style={{ color: s.fg }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-4 py-2 text-xs font-medium text-token-muted uppercase tracking-wider">{children}</th>;
}
function Td({ children }) {
  return <td className="px-4 py-2 text-token-primary" style={{ borderBottom: '1px solid var(--token-border)' }}>{children}</td>;
}

export default function AdminReconciliation() {
  const { tByEn } = useLang();
  const [summary, setSummary] = useState(null);
  const [runs, setRuns] = useState([]);
  const [divergences, setDivergences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Filters
  const [fState, setFState] = useState('open');
  const [fSeverity, setFSeverity] = useState('');
  const [fItemId, setFItemId] = useState('');

  // Drill-down modal
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('accepted');
  const [resolveNote, setResolveNote] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (fState && fState !== 'all') qs.set('state', fState);
      if (fSeverity) qs.set('severity', fSeverity);
      if (fItemId.trim()) qs.set('item_id', fItemId.trim());
      qs.set('limit', '200');

      const [s, r, d] = await Promise.all([
        runtime.get('/api/payouts-v2/reconciliation/summary'),
        runtime.get('/api/payouts-v2/reconciliation/runs?limit=20'),
        runtime.get(`/api/payouts-v2/reconciliation/divergences?${qs.toString()}`),
      ]);
      setSummary(s.data || s);
      setRuns((r.data || r)?.items || []);
      setDivergences((d.data || d)?.items || []);
    } catch (e) {
      setMsg({ kind: 'error', text: `Load failed: ${e?.message || e}` });
    } finally {
      setLoading(false);
    }
  }, [fState, fSeverity, fItemId]);

  useEffect(() => {
    loadAll();
    // Modest refresh cadence — reconciler loop runs every 30min by default.
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  const runNow = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await runtime.post('/api/payouts-v2/reconciliation/run', { window_minutes: 60 * 24 });
      const d = r.data || r;
      setMsg({
        kind: 'ok',
        text: `Run ${d.run_id}: scanned ${d.scanned}, discrepancies ${d.discrepancies} (` +
              `crit ${d.by_severity?.critical || 0} / warn ${d.by_severity?.warning || 0} / info ${d.by_severity?.info || 0}).`,
      });
      loadAll();
    } catch (e) {
      setMsg({ kind: 'error', text: `Run failed: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  }, [loadAll]);

  const openDrill = useCallback((d) => {
    setSelected(d);
    setResolution('accepted');
    setResolveNote('');
  }, []);

  const submitResolve = useCallback(async () => {
    if (!selected) return;
    if (!resolveNote.trim()) {
      setMsg({ kind: 'error', text: 'Resolution note is required (audit trail).' });
      return;
    }
    setBusy(true);
    try {
      await runtime.post(
        `/api/payouts-v2/reconciliation/divergences/${selected.divergence_id}/resolve`,
        { resolution, note: resolveNote.trim() },
      );
      setMsg({ kind: 'ok', text: `Divergence ${selected.divergence_id} resolved (${resolution}).` });
      setSelected(null);
      loadAll();
    } catch (e) {
      setMsg({ kind: 'error', text: `Resolve failed: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  }, [selected, resolution, resolveNote, loadAll]);

  if (loading && !summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-token-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading reconciliation…
      </div>
    );
  }

  const lastRun = summary?.last_run;
  const openTotal = summary?.open_total ?? 0;
  const openCrit = summary?.open_critical ?? 0;
  const openWarn = summary?.open_warning ?? 0;
  const openInfo = summary?.open_info ?? 0;

  return (
    <div className="p-6 space-y-6" data-testid="admin-reconciliation">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-token-primary">
            Reconciliation — Divergence Drill-down
          </h1>
          <p className="text-sm text-token-muted mt-1">
            {tByEn('Mode')} <ToneBadge tone="muted">{summary?.mode || 'passive'}</ToneBadge>
            {lastRun ? (
              <>
                {' '}· last run <code className="font-mono">{lastRun.run_id}</code>
                {' '}· {fmtRelative(lastRun.finished_at || lastRun.started_at)}
                {' '}· scanned {lastRun.scanned} · {lastRun.discrepancies} discrepancies
              </>
            ) : ' · no runs yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/payouts-v2"
            className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-token-primary hover:bg-app-surface-elevated"
            style={{ border: '1px solid var(--token-border)' }}
            data-testid="recon-back-to-queue"
          >
            <ExternalLink className="w-4 h-4" /> {tByEn('Operational Queue')}
          </Link>
          <button
            onClick={loadAll}
            className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-token-primary hover:bg-app-surface-elevated"
            style={{ border: '1px solid var(--token-border)' }}
            data-testid="recon-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {tByEn('Refresh')}
          </button>
          <button
            onClick={runNow}
            disabled={busy}
            className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            style={{
              background: 'var(--token-primary)',
              color: 'var(--token-on-primary, #fff)',
              opacity: busy ? 0.6 : 1,
            }}
            data-testid="recon-run-now-btn"
          >
            <PlayCircle className="w-4 h-4" /> {tByEn('Run Now')}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: msg.kind === 'error' ? 'var(--token-danger-tint)' : 'var(--token-success-tint)',
            color:      msg.kind === 'error' ? 'var(--token-danger)'      : 'var(--token-success)',
            border:     `1px solid ${msg.kind === 'error' ? 'var(--token-danger-border)' : 'var(--token-success-border)'}`,
          }}
          data-testid="recon-msg"
        >
          {msg.text}
        </div>
      )}

      {/* Severity tiles — Pr-7 attention-first */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="recon-severity-strip">
        <SeverityTile
          label={tByEn('Open · Critical')} value={openCrit}
          tone={openCrit > 0 ? 'danger' : 'muted'}
          icon={<ShieldAlert className="w-4 h-4" />}
          testid="recon-tile-critical"
        />
        <SeverityTile
          label={tByEn('Open · Warning')} value={openWarn}
          tone={openWarn > 0 ? 'warning' : 'muted'}
          icon={<AlertTriangle className="w-4 h-4" />}
          testid="recon-tile-warning"
        />
        <SeverityTile
          label={tByEn('Open · Info')} value={openInfo}
          tone={openInfo > 0 ? 'info' : 'muted'}
          icon={<InfoIcon className="w-4 h-4" />}
          testid="recon-tile-info"
        />
        <SeverityTile
          label={tByEn('Open · Total')} value={openTotal}
          tone={openTotal === 0 ? 'neutral' : 'neutral'}
          icon={openTotal === 0 ? <ShieldCheck className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          testid="recon-tile-total"
        />
      </section>

      {/* Filter bar */}
      <section
        className="rounded-xl p-4 flex flex-wrap items-end gap-3"
        style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)' }}
        data-testid="recon-filter-bar"
      >
        <div className="flex items-center gap-2 text-token-muted text-xs uppercase tracking-wider mr-2">
          <Filter className="w-4 h-4" /> {tByEn('Filters')}
        </div>
        <div>
          <label className="block text-xs text-token-muted mb-1" htmlFor="recon-f-state">{tByEn('State')}</label>
          <select
            id="recon-f-state"
            value={fState}
            onChange={e => setFState(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-app-surface text-token-primary"
            style={{ border: '1px solid var(--token-border)' }}
            data-testid="recon-filter-state"
          >
            <option value="open">{tByEn('Open')}</option>
            <option value="resolved">{tByEn('Resolved')}</option>
            <option value="all">{tByEn('All')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-token-muted mb-1" htmlFor="recon-f-severity">{tByEn('Severity')}</label>
          <select
            id="recon-f-severity"
            value={fSeverity}
            onChange={e => setFSeverity(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-app-surface text-token-primary"
            style={{ border: '1px solid var(--token-border)' }}
            data-testid="recon-filter-severity"
          >
            <option value="">{tByEn('All')}</option>
            <option value="critical">{tByEn('Critical')}</option>
            <option value="warning">{tByEn('Warning')}</option>
            <option value="info">{tByEn('Info')}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-token-muted mb-1" htmlFor="recon-f-item">{tByEn('Item ID')}</label>
          <input
            id="recon-f-item"
            value={fItemId}
            onChange={e => setFItemId(e.target.value)}
            placeholder="item_…"
            className="w-full px-3 py-2 rounded-lg text-sm bg-app-surface text-token-primary font-mono"
            style={{ border: '1px solid var(--token-border)' }}
            data-testid="recon-filter-item"
          />
        </div>
      </section>

      {/* Divergences table — drill-down */}
      <section
        className="rounded-xl"
        style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)' }}
        data-testid="recon-divergences-section"
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--token-border)' }}>
          <h2 className="text-sm font-medium text-token-primary">{tByEn('Divergences')}</h2>
          <p className="text-xs text-token-muted mt-1">
            Click a row to drill into local vs provider snapshots and resolve. Observer never mutates payout state directly.
          </p>
        </div>
        {divergences.length === 0 ? (
          <div className="px-4 py-6 text-sm text-token-muted flex items-center gap-2" data-testid="recon-divergences-empty">
            <CheckCircle2 className="w-4 h-4" /> {tByEn('No divergences match the current filter.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--token-border)' }}>
                  <Th>{tByEn('Divergence')}</Th><Th>{tByEn('Type')}</Th><Th>{tByEn('Severity')}</Th>
                  <Th>{tByEn('Item')}</Th><Th>{tByEn('Batch')}</Th><Th>{tByEn('State')}</Th>
                  <Th>{tByEn('Detected')}</Th><Th>{tByEn('Resolved')}</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {divergences.map(d => (
                  <tr
                    key={d.divergence_id}
                    onClick={() => openDrill(d)}
                    className="cursor-pointer hover:bg-app-surface-elevated"
                    data-testid={`recon-row-${d.divergence_id}`}
                  >
                    <Td><code className="text-xs font-mono">{d.divergence_id}</code></Td>
                    <Td>
                      <ToneBadge tone="neutral">{d.divergence_type}</ToneBadge>
                    </Td>
                    <Td>
                      <ToneBadge tone={SEVERITY_TONES[d.severity] || 'neutral'}>{d.severity}</ToneBadge>
                    </Td>
                    <Td>
                      <code className="text-xs font-mono">{d.item_id}</code>
                    </Td>
                    <Td>
                      {d.batch_id ? (
                        <Link
                          to={`/admin/payouts-v2/batches/${d.batch_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-mono text-token-info hover:underline"
                          data-testid={`recon-batch-link-${d.divergence_id}`}
                        >
                          {d.batch_id}
                        </Link>
                      ) : <span className="text-token-muted">—</span>}
                    </Td>
                    <Td>
                      <ToneBadge tone={d.state === 'open' ? 'warning' : 'success'}>{d.state}</ToneBadge>
                    </Td>
                    <Td>{fmtRelative(d.created_at)}</Td>
                    <Td>{fmtRelative(d.resolved_at)}</Td>
                    <Td>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDrill(d); }}
                        className="px-2 py-1 rounded text-xs text-token-info hover:underline"
                        data-testid={`recon-open-${d.divergence_id}`}
                      >
                        Open →
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent runs — audit trail */}
      <section
        className="rounded-xl"
        style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)' }}
        data-testid="recon-runs-section"
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--token-border)' }}>
          <h2 className="text-sm font-medium text-token-primary">{tByEn('Recent runs')}</h2>
          <p className="text-xs text-token-muted mt-1">
            Audit trail of reconciliation passes. Loop cadence env-driven (default 30 min).
          </p>
        </div>
        {runs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-token-muted" data-testid="recon-runs-empty">
            {tByEn('No runs yet. Trigger one with Run Now or wait for the loop tick.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--token-border)' }}>
                  <Th>{tByEn('Run')}</Th><Th>{tByEn('Actor')}</Th><Th>{tByEn('Window')}</Th>
                  <Th>{tByEn('Scanned')}</Th><Th>{tByEn('Discrepancies')}</Th>
                  <Th>{tByEn('Crit')}</Th><Th>{tByEn('Warn')}</Th><Th>{tByEn('Info')}</Th>
                  <Th>{tByEn('Started')}</Th><Th>{tByEn('Duration')}</Th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.run_id} data-testid={`recon-run-${r.run_id}`}>
                    <Td><code className="text-xs font-mono">{r.run_id}</code></Td>
                    <Td><span className="text-xs text-token-muted">{r.actor}</span></Td>
                    <Td>{r.window_minutes}m</Td>
                    <Td>{r.scanned}</Td>
                    <Td>
                      <span className={r.discrepancies > 0 ? 'text-token-warning font-medium' : ''}>
                        {r.discrepancies}
                      </span>
                    </Td>
                    <Td><span className="text-token-danger">{r.by_severity?.critical || 0}</span></Td>
                    <Td><span className="text-token-warning">{r.by_severity?.warning || 0}</span></Td>
                    <Td><span className="text-token-info">{r.by_severity?.info || 0}</span></Td>
                    <Td>{fmtRelative(r.started_at)}</Td>
                    <Td>{r.duration_ms}ms</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Drill-down modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelected(null)}
          data-testid="recon-drill-overlay"
        >
          <div
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-xl p-6"
            style={{ background: 'var(--token-surface)', border: '1px solid var(--token-border)' }}
            onClick={(e) => e.stopPropagation()}
            data-testid="recon-drill-modal"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-token-primary">
                  {tByEn('Divergence drill-down')}
                </h3>
                <code className="text-xs font-mono text-token-muted">{selected.divergence_id}</code>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-token-muted hover:text-token-primary"
                data-testid="recon-drill-close"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-token-muted mb-1">{tByEn('Type')}</div>
                <ToneBadge tone="neutral">{selected.divergence_type}</ToneBadge>
              </div>
              <div>
                <div className="text-xs text-token-muted mb-1">{tByEn('Severity')}</div>
                <ToneBadge tone={SEVERITY_TONES[selected.severity] || 'neutral'}>{selected.severity}</ToneBadge>
              </div>
              <div>
                <div className="text-xs text-token-muted mb-1">{tByEn('Item')}</div>
                <code className="text-xs font-mono">{selected.item_id}</code>
              </div>
              <div>
                <div className="text-xs text-token-muted mb-1">{tByEn('Batch')}</div>
                {selected.batch_id ? (
                  <Link
                    to={`/admin/payouts-v2/batches/${selected.batch_id}`}
                    className="text-xs font-mono text-token-info hover:underline"
                  >
                    {selected.batch_id}
                  </Link>
                ) : <span className="text-token-muted text-xs">—</span>}
              </div>
              <div>
                <div className="text-xs text-token-muted mb-1">{tByEn('Provider ref')}</div>
                <code className="text-xs font-mono">{selected.provider_ref || '—'}</code>
              </div>
              <div>
                <div className="text-xs text-token-muted mb-1">{tByEn('Detected')}</div>
                <div className="text-sm">{fmtRelative(selected.created_at)}</div>
              </div>
            </div>

            {selected.note && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm"
                   style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)' }}>
                <span className="text-xs text-token-muted uppercase tracking-wider">{tByEn('Note')}</span>
                <div className="mt-1 text-token-primary">{selected.note}</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)' }}
                data-testid="recon-drill-local"
              >
                <div className="text-xs text-token-muted uppercase tracking-wider mb-2">{tByEn('Local snapshot')}</div>
                <SnapshotRow k="state"      v={selected.local_snapshot?.state} />
                <SnapshotRow k="amount"     v={fmtMoney(selected.local_snapshot?.amount)} />
                <SnapshotRow k="currency"   v={selected.local_snapshot?.currency} />
                <SnapshotRow k="settled_at" v={selected.local_snapshot?.settled_at || '—'} />
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)' }}
                data-testid="recon-drill-provider"
              >
                <div className="text-xs text-token-muted uppercase tracking-wider mb-2">{tByEn('Provider snapshot')}</div>
                <SnapshotRow k="found"      v={selected.provider_snapshot?.found ? 'yes' : 'no'} />
                <SnapshotRow k="status"     v={selected.provider_snapshot?.status || '—'} />
                <SnapshotRow k="amount"     v={fmtMoney(selected.provider_snapshot?.amount)} />
                <SnapshotRow k="currency"   v={selected.provider_snapshot?.currency || '—'} />
                <SnapshotRow k="settled_at" v={selected.provider_snapshot?.settled_at || '—'} />
              </div>
            </div>

            {selected.state === 'resolved' ? (
              <div
                className="rounded-lg p-3 text-sm"
                style={{
                  background: 'var(--token-success-tint)',
                  color: 'var(--token-success)',
                  border: '1px solid var(--token-success-border)',
                }}
                data-testid="recon-drill-resolved"
              >
                <strong>{tByEn('Resolved:')}</strong> {selected.resolution} · {fmtRelative(selected.resolved_at)}
                {selected.resolution_note && (
                  <div className="mt-1 text-token-primary">“{selected.resolution_note}”</div>
                )}
              </div>
            ) : (
              <div className="space-y-3" data-testid="recon-drill-resolve-form">
                <div>
                  <label className="block text-xs text-token-muted mb-1" htmlFor="recon-resolution">{tByEn('Resolution')}</label>
                  <select
                    id="recon-resolution"
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-app-surface text-token-primary"
                    style={{ border: '1px solid var(--token-border)' }}
                    data-testid="recon-resolution-select"
                  >
                    {RESOLUTION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-token-muted mb-1" htmlFor="recon-resolve-note">
                    {tByEn('Note')} <span className="text-token-danger">*</span> (audit trail)
                  </label>
                  <textarea
                    id="recon-resolve-note"
                    value={resolveNote}
                    onChange={e => setResolveNote(e.target.value)}
                    rows={3}
                    placeholder={tByEn('Why this resolution? Required.')}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-app-surface text-token-primary"
                    style={{ border: '1px solid var(--token-border)' }}
                    data-testid="recon-resolve-note"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="px-3 py-2 rounded-lg text-sm text-token-primary"
                    style={{ border: '1px solid var(--token-border)' }}
                    data-testid="recon-resolve-cancel"
                  >
                    {tByEn('Cancel')}
                  </button>
                  <button
                    onClick={submitResolve}
                    disabled={busy}
                    className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                    style={{
                      background: 'var(--token-primary)',
                      color: 'var(--token-on-primary, #fff)',
                      opacity: busy ? 0.6 : 1,
                    }}
                    data-testid="recon-resolve-submit"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {tByEn('Resolve')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SnapshotRow({ k, v }) {
  return (
    <div className="flex justify-between py-1 text-xs">
      <span className="text-token-muted">{k}</span>
      <span className="text-token-primary font-mono">{v == null ? '—' : String(v)}</span>
    </div>
  );
}
