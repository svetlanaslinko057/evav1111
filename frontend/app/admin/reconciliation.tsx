/**
 * PAY-V2-P4 / P5 — Reconciliation (Expo mobile).
 *
 * Attention-first drill-down for the reconciliation observer.
 * Backend authority (no client aggregation):
 *   • GET  /api/payouts-v2/reconciliation/summary
 *   • GET  /api/payouts-v2/reconciliation/runs?limit=N
 *   • GET  /api/payouts-v2/reconciliation/divergences?state=&severity=&item_id=&limit=N
 *   • POST /api/payouts-v2/reconciliation/run
 *   • POST /api/payouts-v2/reconciliation/divergences/{id}/resolve
 *
 * Roles allowed: admin (server enforces).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@/src/i18n-text';
import { TextInput } from '@/src/i18n-text';
import { translateAlert } from '@/src/i18n-text';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';
import T from '../../src/theme';

type Snapshot = {
  state?: string | null;
  amount?: number | null;
  currency?: string | null;
  settled_at?: string | null;
  status?: string | null;
  found?: boolean;
};

type Divergence = {
  divergence_id: string;
  run_id: string;
  item_id: string;
  batch_id: string | null;
  provider_ref: string | null;
  divergence_type: string;
  severity: 'critical' | 'warning' | 'info';
  note: string;
  local_snapshot: Snapshot;
  provider_snapshot: Snapshot;
  state: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: string | null;
  resolution_note: string | null;
};

type Run = {
  run_id: string;
  actor: string;
  window_minutes: number;
  scanned: number;
  discrepancies: number;
  by_severity: { critical: number; warning: number; info: number };
  started_at: string;
  duration_ms: number;
};

type Summary = {
  last_run: Run | null;
  open_total: number;
  open_critical: number;
  open_warning: number;
  open_info: number;
  mode: string;
};

const RESOLUTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'accepted',           label: 'Accepted (no action)' },
  { value: 'manual_fixed',       label: 'Manual fix applied' },
  { value: 'rejected',           label: 'Rejected (not a divergence)' },
  { value: 'retained_under_law', label: 'Retained under law' },
];

const SEVERITY_FILTERS: Array<{ value: '' | 'critical' | 'warning' | 'info'; label: string }> = [
  { value: '',         label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning',  label: 'Warning' },
  { value: 'info',     label: 'Info' },
];

function fmtMoney(n?: number | null) {
  if (n == null) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function fmtRel(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function severityColor(sev: 'critical' | 'warning' | 'info') {
  if (sev === 'critical') return T.danger as any;
  if (sev === 'warning')  return T.warning as any;
  return T.info as any;
}

export default function AdminReconciliationScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [fSeverity, setFSeverity] = useState<'' | 'critical' | 'warning' | 'info'>('');
  const [fState, setFState] = useState<'open' | 'resolved' | 'all'>('open');

  // Drill-down state
  const [selected, setSelected] = useState<Divergence | null>(null);
  const [resolution, setResolution] = useState('accepted');
  const [resolveNote, setResolveNote] = useState('');

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (fState !== 'all') qs.set('state', fState);
      if (fSeverity) qs.set('severity', fSeverity);
      qs.set('limit', '100');

      const [s, r, d] = await Promise.all([
        api.get('/payouts-v2/reconciliation/summary'),
        api.get('/payouts-v2/reconciliation/runs?limit=10'),
        api.get(`/payouts-v2/reconciliation/divergences?${qs.toString()}`),
      ]);
      setSummary(s.data);
      setRuns(r.data?.items || []);
      setDivergences(d.data?.items || []);
    } catch (e: any) {
      translateAlert('Load failed', e?.message || String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fState, fSeverity]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const runNow = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api.post('/payouts-v2/reconciliation/run', { window_minutes: 60 * 24 });
      const d = r.data || {};
      translateAlert(
        'Reconciliation run complete',
        `Scanned: ${d.scanned}\n` +
        `Discrepancies: ${d.discrepancies}\n` +
        `Critical: ${d.by_severity?.critical || 0}\n` +
        `Warning: ${d.by_severity?.warning || 0}\n` +
        `Info: ${d.by_severity?.info || 0}`,
      );
      load();
    } catch (e: any) {
      translateAlert('Run failed', e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [load]);

  const openDrill = useCallback((d: Divergence) => {
    setSelected(d);
    setResolution('accepted');
    setResolveNote('');
  }, []);

  const submitResolve = useCallback(async () => {
    if (!selected) return;
    if (!resolveNote.trim()) {
      translateAlert('Note required', 'Add a resolution note for the audit trail.');
      return;
    }
    setBusy(true);
    try {
      await api.post(
        `/payouts-v2/reconciliation/divergences/${selected.divergence_id}/resolve`,
        { resolution, note: resolveNote.trim() },
      );
      setSelected(null);
      load();
    } catch (e: any) {
      translateAlert('Resolve failed', e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [selected, resolution, resolveNote, load]);

  if (loading && !summary) {
    return (
      <View style={styles.center} testID="admin-recon-loading">
        <ActivityIndicator color={T.primary as any} />
        <Text style={styles.muted}>Loading reconciliation…</Text>
      </View>
    );
  }

  const lastRun = summary?.last_run;

  return (
    <>
      <Stack.Screen options={{ title: 'Reconciliation' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={T.primary as any}
          />
        }
        testID="admin-recon-screen"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reconciliation</Text>
          <Text style={styles.subtitle}>
            Mode {summary?.mode || 'passive'}
            {lastRun ? ` · last ${fmtRel(lastRun.finished_at || lastRun.started_at)} · ${lastRun.scanned} scanned` : ' · no runs yet'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={runNow}
            disabled={busy}
            style={[styles.runBtn, busy && { opacity: 0.5 }]}
            testID="admin-recon-run-btn"
          >
            <Ionicons name="play-circle" size={18} color="#fff" />
            <Text style={styles.runBtnText}>Run Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/admin/payouts')}
            style={styles.linkBtn}
            testID="admin-recon-to-queue"
          >
            <Ionicons name="layers-outline" size={16} color={T.info as any} />
            <Text style={[styles.linkBtnText, { color: T.info as any }]}>Queue</Text>
          </TouchableOpacity>
        </View>

        {/* Severity tiles */}
        <View style={styles.tilesGrid}>
          <Tile
            label="Critical"
            value={summary?.open_critical ?? 0}
            tone={(summary?.open_critical ?? 0) > 0 ? 'danger' : 'muted'}
            icon="shield-half-outline"
            testID="admin-recon-tile-critical"
          />
          <Tile
            label="Warning"
            value={summary?.open_warning ?? 0}
            tone={(summary?.open_warning ?? 0) > 0 ? 'warning' : 'muted'}
            icon="warning-outline"
            testID="admin-recon-tile-warning"
          />
          <Tile
            label="Info"
            value={summary?.open_info ?? 0}
            tone={(summary?.open_info ?? 0) > 0 ? 'info' : 'muted'}
            icon="information-circle-outline"
            testID="admin-recon-tile-info"
          />
          <Tile
            label="Total open"
            value={summary?.open_total ?? 0}
            tone={(summary?.open_total ?? 0) === 0 ? 'success' : 'neutral'}
            icon={(summary?.open_total ?? 0) === 0 ? 'checkmark-circle-outline' : 'pulse-outline'}
            testID="admin-recon-tile-total"
          />
        </View>

        {/* Filter — state */}
        <Text style={styles.sectionLabel}>State</Text>
        <View style={styles.chipsRow}>
          {(['open', 'resolved', 'all'] as const).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setFState(s)}
              style={[styles.chip, fState === s && styles.chipActive]}
              testID={`admin-recon-state-${s}`}
            >
              <Text style={[styles.chipText, fState === s && styles.chipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter — severity */}
        <Text style={styles.sectionLabel}>Severity</Text>
        <View style={styles.chipsRow}>
          {SEVERITY_FILTERS.map(f => (
            <TouchableOpacity
              key={f.value || 'all'}
              onPress={() => setFSeverity(f.value)}
              style={[styles.chip, fSeverity === f.value && styles.chipActive]}
              testID={`admin-recon-sev-${f.value || 'all'}`}
            >
              <Text style={[styles.chipText, fSeverity === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Divergences list */}
        <Text style={styles.sectionLabel}>Divergences</Text>
        {divergences.length === 0 ? (
          <View style={styles.emptyCard} testID="admin-recon-divergences-empty">
            <Ionicons name="shield-checkmark-outline" size={18} color={T.success as any} />
            <Text style={styles.body}>No divergences match the current filter.</Text>
          </View>
        ) : (
          divergences.map(d => (
            <TouchableOpacity
              key={d.divergence_id}
              onPress={() => openDrill(d)}
              style={[styles.divCard, { borderColor: severityColor(d.severity) }]}
              testID={`admin-recon-row-${d.divergence_id}`}
            >
              <View style={styles.divHead}>
                <Text style={styles.divType} numberOfLines={1}>{d.divergence_type}</Text>
                <View style={[styles.sevPill, { backgroundColor: severityColor(d.severity) + '22', borderColor: severityColor(d.severity) }]}>
                  <Text style={[styles.sevPillText, { color: severityColor(d.severity) }]}>{d.severity}</Text>
                </View>
              </View>
              <Text style={styles.muted} numberOfLines={1}>
                {d.item_id}{d.batch_id ? ` · ${d.batch_id}` : ''}
              </Text>
              <Text style={styles.body} numberOfLines={2}>{d.note}</Text>
              <View style={styles.divFooter}>
                <Text style={styles.muted}>{fmtRel(d.created_at)}</Text>
                {d.state === 'resolved' ? (
                  <Text style={[styles.muted, { color: T.success as any }]}>
                    resolved · {d.resolution}
                  </Text>
                ) : (
                  <Text style={[styles.muted, { color: T.warning as any }]}>open · tap to resolve</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent runs */}
        <Text style={styles.sectionLabel}>Recent runs</Text>
        {runs.length === 0 ? (
          <View style={styles.emptyCard} testID="admin-recon-runs-empty">
            <Ionicons name="hourglass-outline" size={18} color={T.textMuted as any} />
            <Text style={styles.body}>No runs yet. Tap Run Now or wait for the loop tick.</Text>
          </View>
        ) : (
          runs.map(r => (
            <View key={r.run_id} style={styles.runCard} testID={`admin-recon-run-${r.run_id}`}>
              <View style={styles.runHead}>
                <Text style={styles.runId} numberOfLines={1}>{r.run_id}</Text>
                <Text style={styles.muted}>{r.duration_ms}ms</Text>
              </View>
              <Text style={styles.muted} numberOfLines={1}>
                {r.actor} · window {r.window_minutes}m · {fmtRel(r.started_at)}
              </Text>
              <Text style={styles.body}>
                Scanned <Text style={styles.bold}>{r.scanned}</Text> ·
                {' '}
                Disc <Text style={[styles.bold, { color: r.discrepancies > 0 ? T.warning as any : T.text as any }]}>
                  {r.discrepancies}
                </Text>
                {' '}
                (<Text style={[styles.bold, { color: T.danger as any }]}>{r.by_severity?.critical || 0}</Text>
                {' / '}
                <Text style={[styles.bold, { color: T.warning as any }]}>{r.by_severity?.warning || 0}</Text>
                {' / '}
                <Text style={[styles.bold, { color: T.info as any }]}>{r.by_severity?.info || 0}</Text>)
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Drill-down modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation()}
            testID="admin-recon-drill-modal"
          >
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>Divergence</Text>
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  testID="admin-recon-drill-close"
                >
                  <Ionicons name="close" size={22} color={T.textMuted as any} />
                </TouchableOpacity>
              </View>
              {selected && (
                <>
                  <Text style={styles.modalSubId}>{selected.divergence_id}</Text>

                  <View style={styles.kvRow}><Text style={styles.kvLabel}>Type</Text><Text style={styles.kvValue}>{selected.divergence_type}</Text></View>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>Severity</Text>
                    <Text style={[styles.kvValue, { color: severityColor(selected.severity) }]}>{selected.severity}</Text>
                  </View>
                  <View style={styles.kvRow}><Text style={styles.kvLabel}>Item</Text><Text style={[styles.kvValue, styles.mono]}>{selected.item_id}</Text></View>
                  <View style={styles.kvRow}><Text style={styles.kvLabel}>Batch</Text><Text style={[styles.kvValue, styles.mono]}>{selected.batch_id || '—'}</Text></View>
                  <View style={styles.kvRow}><Text style={styles.kvLabel}>Provider ref</Text><Text style={[styles.kvValue, styles.mono]}>{selected.provider_ref || '—'}</Text></View>
                  <View style={styles.kvRow}><Text style={styles.kvLabel}>Detected</Text><Text style={styles.kvValue}>{fmtRel(selected.created_at)}</Text></View>

                  {selected.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>Note</Text>
                      <Text style={styles.body}>{selected.note}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.sectionLabelInline}>Local snapshot</Text>
                  <SnapshotCard snap={selected.local_snapshot} testID="admin-recon-drill-local" />

                  <Text style={styles.sectionLabelInline}>Provider snapshot</Text>
                  <SnapshotCard snap={selected.provider_snapshot} testID="admin-recon-drill-provider" />

                  {selected.state === 'resolved' ? (
                    <View style={styles.resolvedBox} testID="admin-recon-drill-resolved">
                      <Text style={styles.resolvedTitle}>
                        Resolved · {selected.resolution}
                      </Text>
                      <Text style={styles.muted}>{fmtRel(selected.resolved_at)}</Text>
                      {selected.resolution_note ? (
                        <Text style={styles.body}>“{selected.resolution_note}”</Text>
                      ) : null}
                    </View>
                  ) : (
                    <View testID="admin-recon-drill-resolve-form">
                      <Text style={styles.sectionLabelInline}>Resolution</Text>
                      <View style={styles.resolutionList}>
                        {RESOLUTION_OPTIONS.map(o => (
                          <TouchableOpacity
                            key={o.value}
                            onPress={() => setResolution(o.value)}
                            style={[styles.resOption, resolution === o.value && styles.resOptionActive]}
                            testID={`admin-recon-res-${o.value}`}
                          >
                            <Ionicons
                              name={resolution === o.value ? 'radio-button-on' : 'radio-button-off'}
                              size={16}
                              color={resolution === o.value ? (T.primary as any) : (T.textMuted as any)}
                            />
                            <Text style={[styles.resOptionText, resolution === o.value && styles.resOptionTextActive]}>
                              {o.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.sectionLabelInline}>Note <Text style={{ color: T.danger as any }}>*</Text></Text>
                      <TextInput
                        value={resolveNote}
                        onChangeText={setResolveNote}
                        placeholder="Why this resolution? Required."
                        placeholderTextColor={T.textMuted as any}
                        multiline
                        numberOfLines={3}
                        style={styles.noteInput}
                        testID="admin-recon-drill-note-input"
                      />

                      <TouchableOpacity
                        onPress={submitResolve}
                        disabled={busy}
                        style={[styles.submitBtn, busy && { opacity: 0.5 }]}
                        testID="admin-recon-drill-submit"
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.submitBtnText}>Resolve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SnapshotCard({ snap, testID }: { snap: Snapshot; testID?: string }) {
  return (
    <View style={styles.snapBox} testID={testID}>
      {snap.state !== undefined && (
        <View style={styles.kvRow}><Text style={styles.kvLabel}>state</Text><Text style={[styles.kvValue, styles.mono]}>{String(snap.state ?? '—')}</Text></View>
      )}
      {snap.status !== undefined && (
        <View style={styles.kvRow}><Text style={styles.kvLabel}>status</Text><Text style={[styles.kvValue, styles.mono]}>{String(snap.status ?? '—')}</Text></View>
      )}
      <View style={styles.kvRow}><Text style={styles.kvLabel}>amount</Text><Text style={[styles.kvValue, styles.mono]}>{fmtMoney(snap.amount as any)}</Text></View>
      <View style={styles.kvRow}><Text style={styles.kvLabel}>currency</Text><Text style={[styles.kvValue, styles.mono]}>{String(snap.currency ?? '—')}</Text></View>
      {snap.settled_at !== undefined && (
        <View style={styles.kvRow}><Text style={styles.kvLabel}>settled_at</Text><Text style={[styles.kvValue, styles.mono]} numberOfLines={1}>{String(snap.settled_at ?? '—')}</Text></View>
      )}
      {snap.found !== undefined && (
        <View style={styles.kvRow}><Text style={styles.kvLabel}>found</Text><Text style={[styles.kvValue, styles.mono]}>{snap.found ? 'yes' : 'no'}</Text></View>
      )}
    </View>
  );
}

type Tone = 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'muted';
function toneColor(tone: Tone) {
  switch (tone) {
    case 'success': return T.success as any;
    case 'info':    return T.info as any;
    case 'danger':  return T.danger as any;
    case 'warning': return T.warning as any;
    case 'muted':   return T.textMuted as any;
    default:        return T.text as any;
  }
}

function Tile({
  label, value, tone, icon, testID,
}: { label: string; value: number; tone: Tone; icon: any; testID?: string }) {
  return (
    <View style={[styles.tile, { borderColor: toneColor(tone) }]} testID={testID}>
      <View style={styles.tileRow}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Ionicons name={icon} size={14} color={toneColor(tone)} />
      </View>
      <Text style={[styles.tileValue, { color: toneColor(tone) }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg as any, padding: 16 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg as any, padding: 24 },

  header:    { marginBottom: 12 },
  title:     { color: T.text as any, fontSize: 24, fontWeight: '700' },
  subtitle:  { color: T.textMuted as any, fontSize: 12, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  runBtn: {
    backgroundColor: T.primary as any, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  runBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  linkBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderColor: T.info as any, borderWidth: 1,
  },
  linkBtnText: { fontWeight: '600', fontSize: 14 },

  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tile:      {
    flexBasis: '47%', flexGrow: 1, minWidth: 140,
    backgroundColor: T.surface as any, borderWidth: 1, borderRadius: 10, padding: 12,
  },
  tileRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileLabel: { color: T.textMuted as any, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  tileValue: { fontSize: 24, fontWeight: '700', marginTop: 4 },

  sectionLabel: {
    color: T.textMuted as any, fontSize: 12, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8, marginBottom: 8,
  },
  sectionLabelInline: {
    color: T.textMuted as any, fontSize: 12, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
    minHeight: 28, alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: T.primary as any, borderColor: T.primary as any },
  chipText:   { color: T.textSecondary as any, fontSize: 12, fontWeight: '600', lineHeight: 16, includeFontPadding: false as any },
  chipTextActive: { color: '#fff' },

  emptyCard: {
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
    borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16,
  },

  divCard: {
    backgroundColor: T.surface as any, borderWidth: 1, borderRadius: 10,
    padding: 12, marginBottom: 10,
  },
  divHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  divType: { color: T.text as any, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  sevPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  sevPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  divFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },

  runCard: {
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  runHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  runId:   { color: T.text as any, fontSize: 13, fontWeight: '700', fontFamily: 'Courier', flex: 1, marginRight: 8 },

  body:  { color: T.text as any, fontSize: 14 },
  muted: { color: T.textMuted as any, fontSize: 12 },
  bold:  { fontWeight: '700' },
  mono:  { fontFamily: 'Courier' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.bg as any, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: T.text as any, fontSize: 20, fontWeight: '700' },
  modalSubId: { color: T.textMuted as any, fontSize: 12, fontFamily: 'Courier', marginBottom: 12 },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  kvLabel: { color: T.textMuted as any, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  kvValue: { color: T.text as any, fontSize: 13, maxWidth: '60%', textAlign: 'right' },

  noteBox: {
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
    borderRadius: 10, padding: 12, marginTop: 12,
  },
  noteLabel: { color: T.textMuted as any, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },

  snapBox: {
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 4,
  },

  resolvedBox: {
    marginTop: 16, padding: 12, borderRadius: 10,
    backgroundColor: T.surface as any, borderColor: T.success as any, borderWidth: 1,
  },
  resolvedTitle: { color: T.success as any, fontSize: 14, fontWeight: '700', marginBottom: 4 },

  resolutionList: { gap: 8, marginBottom: 8 },
  resOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
  },
  resOptionActive: { borderColor: T.primary as any, backgroundColor: T.surface as any },
  resOptionText: { color: T.textSecondary as any, fontSize: 14 },
  resOptionTextActive: { color: T.text as any, fontWeight: '600' },

  noteInput: {
    backgroundColor: T.surface as any, borderColor: T.border as any, borderWidth: 1,
    borderRadius: 10, padding: 12, color: T.text as any, fontSize: 14,
    minHeight: 80, textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 12, backgroundColor: T.primary as any,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
