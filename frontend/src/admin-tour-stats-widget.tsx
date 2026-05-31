/**
 * Admin · Onboarding tour analytics widget
 *
 * Renders a compact card backed by `GET /api/admin/onboarding/tour-stats`:
 *
 *   [ role · completion% · totals · dropout median ]
 *   [ histogram bars ]
 *
 * One card per supported role (client/developer/admin/operator). The widget is
 * self-contained — own loading, error, refresh — so it can be dropped into
 * any admin surface (`admin/home.tsx`, `admin/control.tsx`, etc.) without
 * affecting the parent state machine.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from './api';
import T from './theme';

type RoleStats = {
  total_users: number;
  completed: number;
  skipped: number;
  pending: number;
  completion_rate: number | null;
  avg_dropout_step: number | null;
  median_dropout_step: number | null;
  step_histogram: Record<string, number>;
};

type TourStatsResp = {
  roles: Record<string, RoleStats>;
  computed_at: string;
};

const ROLE_ORDER = ['client', 'developer', 'admin', 'operator'] as const;

const ROLE_LABEL: Record<string, string> = {
  client: 'Client',
  developer: 'Developer',
  admin: 'Admin',
  operator: 'Operator',
};

function formatPct(rate: number | null): string {
  if (rate === null || rate === undefined) return '—';
  return `${Math.round(rate * 100)}%`;
}

function formatStep(step: number | null): string {
  if (step === null || step === undefined) return '—';
  return `step ${step + 1}`; // display as 1-based for humans
}

export default function TourStatsWidget() {
  const [data, setData] = useState<TourStatsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<TourStatsResp>('/admin/onboarding/tour-stats');
      setData(r.data);
    } catch (e: any) {
      const code = e?.response?.status;
      setError(code === 403 ? 'Admin role required' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={s.card} testID="tour-stats-widget-loading">
        <View style={s.header}>
          <Text style={s.title}>Onboarding tour</Text>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={T.primary} size="small" />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.card} testID="tour-stats-widget-error">
        <View style={s.header}>
          <Text style={s.title}>Onboarding tour</Text>
          <TouchableOpacity onPress={load} testID="tour-stats-widget-retry">
            <Ionicons name="refresh" size={16} color={T.primary} />
          </TouchableOpacity>
        </View>
        <Text style={s.errorText}>{error || 'No data'}</Text>
      </View>
    );
  }

  return (
    <View style={s.card} testID="tour-stats-widget">
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Onboarding tour</Text>
          <Text style={s.subtitle}>
            Completion and drop-out by role · {new Date(data.computed_at).toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={load}
          style={s.refreshBtn}
          testID="tour-stats-widget-refresh"
        >
          <Ionicons name="refresh" size={16} color={T.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.rolesRow}>
        {ROLE_ORDER.map((role) => {
          const r = data.roles[role];
          if (!r) return null;
          return (
            <RoleCard key={role} role={role} stats={r} />
          );
        })}
      </View>
    </View>
  );
}

function RoleCard({ role, stats }: { role: string; stats: RoleStats }) {
  // Histogram normalization: scale bar widths against the busiest bucket.
  const histEntries = Object.entries(stats.step_histogram)
    .map(([k, v]) => ({ step: Number(k), count: v }))
    .sort((a, b) => a.step - b.step);
  const maxCount = histEntries.reduce((m, e) => Math.max(m, e.count), 0);

  // Decide a "completion-rate" accent color: green ≥75%, amber 40-74%, red <40%, neutral when n/a.
  let rateColor: string = T.textMuted;
  if (stats.completion_rate !== null) {
    if (stats.completion_rate >= 0.75) rateColor = T.success;
    else if (stats.completion_rate >= 0.4) rateColor = T.primary;
    else rateColor = T.danger;
  }

  return (
    <View style={s.roleCard} testID={`tour-stats-role-${role}`}>
      <View style={s.roleHeader}>
        <Text style={s.roleLabel}>{ROLE_LABEL[role] || role}</Text>
        <Text style={[s.rolePct, { color: rateColor }]}>
          {formatPct(stats.completion_rate)}
        </Text>
      </View>

      <View style={s.kvRow}>
        <Text style={s.kvKey}>Users</Text>
        <Text style={s.kvVal}>{stats.total_users}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvKey}>Completed</Text>
        <Text style={[s.kvVal, { color: T.success }]}>{stats.completed}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvKey}>Skipped</Text>
        <Text style={[s.kvVal, { color: T.danger }]}>{stats.skipped}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvKey}>Pending</Text>
        <Text style={[s.kvVal, { color: T.textMuted }]}>{stats.pending}</Text>
      </View>
      <View style={s.kvRow}>
        <Text style={s.kvKey}>Median drop</Text>
        <Text style={s.kvVal}>{formatStep(stats.median_dropout_step)}</Text>
      </View>

      {histEntries.length > 0 ? (
        <View style={s.histWrap} testID={`tour-stats-hist-${role}`}>
          <Text style={s.histTitle}>Dropout histogram</Text>
          {histEntries.map((e) => {
            const widthPct = maxCount > 0 ? (e.count / maxCount) * 100 : 0;
            return (
              <View key={e.step} style={s.histRow}>
                <Text style={s.histLabel}>step {e.step + 1}</Text>
                <View style={s.histBarTrack}>
                  <View
                    style={[
                      s.histBarFill,
                      { width: `${widthPct}%`, backgroundColor: T.danger },
                    ]}
                  />
                </View>
                <Text style={s.histCount}>{e.count}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={s.histEmpty}>No drop-outs recorded yet.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.surface1,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius,
    padding: T.md,
    marginTop: T.md,
    marginBottom: T.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: T.md,
  },
  title: {
    color: T.text,
    fontSize: T.body,
    fontWeight: '800',
  },
  subtitle: {
    color: T.textMuted,
    fontSize: T.tiny,
    marginTop: 3,
    fontWeight: '600',
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: T.surface2,
    borderWidth: 1,
    borderColor: T.border,
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: T.textMuted,
    fontSize: T.small,
    paddingVertical: 12,
    textAlign: 'center',
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: T.sm,
  },
  roleCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    backgroundColor: T.surface2,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radiusSm,
    padding: T.sm,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: T.sm,
  },
  roleLabel: {
    color: T.text,
    fontSize: T.small,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rolePct: {
    fontSize: T.body,
    fontWeight: '800',
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  kvKey: {
    color: T.textMuted,
    fontSize: T.tiny,
    fontWeight: '600',
  },
  kvVal: {
    color: T.text,
    fontSize: T.tiny,
    fontWeight: '800',
  },
  histWrap: {
    marginTop: T.sm,
    paddingTop: T.sm,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  histTitle: {
    color: T.textMuted,
    fontSize: T.tiny,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  histLabel: {
    color: T.textMuted,
    fontSize: T.tiny,
    width: 50,
    fontWeight: '600',
  },
  histBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: T.surface1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  histBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  histCount: {
    color: T.text,
    fontSize: T.tiny,
    width: 22,
    textAlign: 'right',
    fontWeight: '800',
  },
  histEmpty: {
    color: T.textMuted,
    fontSize: T.tiny,
    fontStyle: 'italic',
    marginTop: T.sm,
    paddingTop: T.sm,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
});
