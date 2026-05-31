/**
 * Admin · Marketplace Quality (formerly AdminQAPage).
 *
 * Service provider quality monitoring · flag · limit · restore.
 * Re-skinned to use theme-aware tokens (works in both dark and light).
 */
import { useEffect, useState, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import {
  ShieldAlert, AlertTriangle, TrendingDown, Users, BarChart3,
  XCircle, Flag, Ban, Lock, Unlock,
} from 'lucide-react';

import { runtime } from '@/runtime';

const AdminMarketplaceQuality = () => {
  const { tByEn } = useLang();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [overview, setOverview] = useState(null);
  const [providers, setProviders] = useState([]);
  const [issues, setIssues] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, pv, isr] = await Promise.all([
        runtime.get('/api/admin/qa/overview'),
        runtime.get('/api/admin/qa/providers'),
        runtime.get('/api/admin/qa/issues'),
      ]);
      setOverview(ov.data?.summary || ov.data);
      setProviders(pv.data?.providers || pv.data || []);
      setIssues(isr.data?.issues || isr.data || []);
    } catch (e) {
      console.error('mktq load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleFlag    = (uid) => runAction(uid, 'flag-provider', { provider_id: uid, reason: 'Manual review' });
  const handleLimit   = (uid) => runAction(uid, 'limit-provider', { provider_id: uid, reason: 'Low quality score' });
  const handleUnlimit = (uid) => runAction(uid, 'unlimit-provider', { provider_id: uid });

  const runAction = async (uid, endpoint, body) => {
    setActionLoading((s) => ({ ...s, [uid]: true }));
    try {
      await runtime.post(`/api/admin/qa/${endpoint}`, body);
      await fetchAll();
    } finally {
      setActionLoading((s) => ({ ...s, [uid]: false }));
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" data-testid="mktq-loading">
        <div className="w-8 h-8 border-2 border-border border-t-signal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-marketplace-quality">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{tByEn('Marketplace Quality')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{tByEn('Service provider quality monitoring · flag · limit · restore')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
        {['overview', 'providers', 'issues'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-signal text-[var(--t-signal-ink)] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`mktq-tab-${t}`}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div data-testid="mktq-overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MetricCard label={tByEn('Health Score')}      value={`${overview.health_score}%`}  icon={<ShieldAlert className="w-4 h-4" />}      color={overview.health_score >= 80 ? 'success' : overview.health_score >= 50 ? 'warning' : 'danger'} testId="health-score" />
            <MetricCard label={tByEn('Dispute Rate')}      value={`${overview.dispute_rate}%`}  icon={<AlertTriangle className="w-4 h-4" />}    color={overview.dispute_rate < 5 ? 'success' : 'danger'} testId="dispute-rate" />
            <MetricCard label={tByEn('Flagged Providers')} value={overview.flagged_providers}   icon={<Flag className="w-4 h-4" />}             color="warning" testId="flagged-count" />
            <MetricCard label={tByEn('Limited Providers')} value={overview.limited_providers}   icon={<Ban className="w-4 h-4" />}              color="danger" testId="limited-count" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label={tByEn('Total Providers')}   value={overview.total_providers}        icon={<Users className="w-4 h-4" />}            color="signal" />
            <MetricCard label={tByEn('Total Bookings')}    value={overview.total_bookings}         icon={<BarChart3 className="w-4 h-4" />}        color="signal" />
            <MetricCard label={tByEn('Missed Requests')}   value={overview.total_missed_requests}  icon={<TrendingDown className="w-4 h-4" />}     color="warning" />
            <MetricCard label={tByEn('Low Quality')}       value={overview.low_quality_providers}  icon={<XCircle className="w-4 h-4" />}          color="danger" />
          </div>
        </div>
      )}

      {tab === 'providers' && (
        <div data-testid="mktq-providers">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{tByEn('Provider')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{tByEn('Score')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{tByEn('Tier')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{tByEn('Bookings')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{tByEn('Issues')}</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">{tByEn('Lost Revenue')}</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">{tByEn('Action')}</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.user_id} className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors" data-testid={`provider-row-${p.user_id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.qa_limited && <Ban className="w-3.5 h-3.5 text-danger" />}
                        {p.qa_flagged && !p.qa_limited && <Flag className="w-3.5 h-3.5 text-warning" />}
                        <span className="text-foreground font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        p.quality_score >= 70 ? 'bg-success/15 text-success border border-success/30'
                        : p.quality_score >= 40 ? 'bg-warning/15 text-warning border border-warning/30'
                        : 'bg-danger/15 text-danger border border-danger/30'
                      }`}>{p.quality_score}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.tier}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.total_bookings}</td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{p.breakdown?.disputes?.count || 0}d / {p.breakdown?.complaints?.count || 0}c</span>
                    </td>
                    <td className="px-4 py-3 text-danger">{p.lost_revenue > 0 ? `$${p.lost_revenue}` : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.qa_limited ? (
                          <button onClick={() => handleUnlimit(p.user_id)} disabled={actionLoading[p.user_id]}
                            className="flex items-center gap-1 px-2 py-1 bg-success/15 hover:bg-success/25 border border-success/30 rounded text-[11px] font-medium text-success transition-colors"
                            data-testid={`unlimit-${p.user_id}`}
                          ><Unlock className="w-3 h-3" /> {tByEn('Restore')}</button>
                        ) : (
                          <>
                            {!p.qa_flagged && (
                              <button onClick={() => handleFlag(p.user_id)} disabled={actionLoading[p.user_id]}
                                className="flex items-center gap-1 px-2 py-1 bg-warning/15 hover:bg-warning/25 border border-warning/30 rounded text-[11px] font-medium text-warning transition-colors"
                                data-testid={`flag-${p.user_id}`}
                              ><Flag className="w-3 h-3" /> {tByEn('Flag')}</button>
                            )}
                            <button onClick={() => handleLimit(p.user_id)} disabled={actionLoading[p.user_id]}
                              className="flex items-center gap-1 px-2 py-1 bg-danger/15 hover:bg-danger/25 border border-danger/30 rounded text-[11px] font-medium text-danger transition-colors"
                              data-testid={`limit-${p.user_id}`}
                            ><Lock className="w-3 h-3" /> {tByEn('Limit')}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {providers.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">{tByEn('No providers')}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'issues' && (
        <div className="space-y-2" data-testid="mktq-issues">
          {issues.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-muted-foreground">{tByEn('No quality issues detected')}</p>
            </div>
          )}
          {issues.map((issue) => (
            <div key={issue.issue_id} className={`flex items-center justify-between bg-card border rounded-xl px-4 py-3 ${
              issue.severity === 'critical' ? 'border-danger/30'
              : issue.severity === 'high' ? 'border-warning/30'
              : 'border-border'
            }`} data-testid={`issue-${issue.issue_id}`}>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  issue.severity === 'critical' ? 'bg-danger/15 text-danger'
                  : issue.severity === 'high' ? 'bg-warning/15 text-warning'
                  : 'bg-muted text-muted-foreground'
                }`}>{issue.severity}</span>
                <div>
                  <p className="text-sm text-foreground">{issue.type === 'dispute' ? 'Dispute' : issue.type === 'complaint' ? 'Complaint' : 'Auto-flagged'}: <span className="text-muted-foreground">{issue.provider_name}</span></p>
                  {issue.message && <p className="text-xs text-muted-foreground mt-0.5">{issue.message}</p>}
                </div>
              </div>
              {issue.amount > 0 && <span className="text-sm font-medium text-danger">${issue.amount}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const COLOR_MAP = {
  success: 'bg-success/10 border-success/25 text-success',
  warning: 'bg-warning/10 border-warning/25 text-warning',
  danger:  'bg-danger/10  border-danger/25  text-danger',
  signal:  'bg-signal/10  border-signal/25  text-signal',
};

const MetricCard = ({ label, value, icon, color = 'signal', testId }) => {
  const tone = COLOR_MAP[color] || COLOR_MAP.signal;
  return (
    <div className={`${tone} border rounded-xl p-4`} data-testid={testId}>
      <div className="flex items-center gap-2 mb-2 opacity-90">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
};

export default AdminMarketplaceQuality;
