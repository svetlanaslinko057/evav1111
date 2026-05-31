/**
 * /admin/portfolio — admin manage portfolio cases + inquiries (leads).
 *
 * Two tabs:
 *   - Cases: list of all cases (incl. unpublished). Read-only here; edit
 *     happens on web admin (richer editor with image upload). Toggles
 *     `published` and `featured` inline.
 *   - Inquiries: list of leads from the public CTAs. Update status inline
 *     (new → contacted → qualified → converted → closed).
 */
import { useEffect, useState, useCallback } from 'react';
import { Text } from '@/src/i18n-text';
import { View, Pressable, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/api';
import T from '../../src/theme';

type Tab = 'cases' | 'inquiries';

interface PortfolioCase {
  case_id: string;
  title: string;
  client_name: string;
  industry: string;
  status?: string;
  published?: boolean;
  featured?: boolean;
  starting_from?: number | null;
}

interface PortfolioInquiry {
  inquiry_id: string;
  case_id?: string | null;
  case_title?: string | null;
  intent: string;
  full_name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message: string;
  budget_range?: string | null;
  timeline?: string | null;
  status: string;
  created_at: string;
}

const STATUS_FLOW = ['new', 'contacted', 'qualified', 'converted', 'closed'];

export default function AdminPortfolioScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cases');
  const [cases, setCases] = useState<PortfolioCase[]>([]);
  const [inquiries, setInquiries] = useState<PortfolioInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      if (tab === 'cases') {
        const r = await api.get<PortfolioCase[]>('/admin/portfolio');
        setCases(r.data || []);
      } else {
        const r = await api.get<PortfolioInquiry[]>('/admin/portfolio/inquiries');
        setInquiries(r.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const advanceStatus = async (inq: PortfolioInquiry) => {
    const idx = STATUS_FLOW.indexOf(inq.status);
    const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : STATUS_FLOW[0];
    try {
      const r = await api.patch<PortfolioInquiry>(`/admin/portfolio/inquiries/${inq.inquiry_id}`, {
        status: next,
      });
      setInquiries((prev) => prev.map((x) => (x.inquiry_id === inq.inquiry_id ? r.data : x)));
    } catch (err: any) {
      setError(err?.message || 'Could not update status');
    }
  };

  const togglePublished = async (c: PortfolioCase) => {
    try {
      const r = await api.patch<PortfolioCase>(`/admin/portfolio/${c.case_id}`, {
        published: !c.published,
      });
      setCases((prev) => prev.map((x) => (x.case_id === c.case_id ? r.data : x)));
    } catch (err: any) {
      setError(err?.message || 'Could not update');
    }
  };

  const toggleFeatured = async (c: PortfolioCase) => {
    try {
      const r = await api.patch<PortfolioCase>(`/admin/portfolio/${c.case_id}`, {
        featured: !c.featured,
      });
      setCases((prev) => prev.map((x) => (x.case_id === c.case_id ? r.data : x)));
    } catch (err: any) {
      setError(err?.message || 'Could not update');
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backBtn}
          testID="admin-portfolio-back"
          hitSlop={12}
        >
          <Text style={s.backArrow}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Portfolio</Text>
      </View>

      <View style={s.tabRow}>
        <TabBtn
          label={`Cases (${cases.length})`}
          active={tab === 'cases'}
          onPress={() => setTab('cases')}
          testID="admin-portfolio-tab-cases"
        />
        <TabBtn
          label={`Inquiries (${inquiries.length})`}
          active={tab === 'inquiries'}
          onPress={() => setTab('inquiries')}
          testID="admin-portfolio-tab-inquiries"
        />
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={T.primary}
          />
        }
      >
        {loading ? (
          <View style={s.loadingBlock}>
            <ActivityIndicator size="small" color={T.primary} />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && tab === 'cases' && (
          <View style={s.list}>
            {cases.length === 0 && (
              <Text style={s.emptyText}>No cases yet.</Text>
            )}
            {cases.map((c) => (
              <Pressable
                key={c.case_id}
                style={s.row}
                onPress={() => router.push(`/portfolio/${c.case_id}` as any)}
                testID={`admin-case-${c.case_id}`}
              >
                <View style={s.rowMain}>
                  <Text style={s.rowTitle}>{c.title}</Text>
                  <Text style={s.rowSub}>
                    {c.industry} · {c.client_name}
                    {c.starting_from ? ` · from $${Number(c.starting_from).toLocaleString()}` : ''}
                  </Text>
                </View>
                <View style={s.rowToggles}>
                  <TogglePill
                    label="LIVE"
                    on={!!c.published}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      togglePublished(c);
                    }}
                    testID={`toggle-published-${c.case_id}`}
                  />
                  <TogglePill
                    label="FEAT"
                    on={!!c.featured}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      toggleFeatured(c);
                    }}
                    testID={`toggle-featured-${c.case_id}`}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!loading && tab === 'inquiries' && (
          <View style={s.list}>
            {inquiries.length === 0 && (
              <Text style={s.emptyText}>No inquiries yet.</Text>
            )}
            {inquiries.map((inq) => (
              <View
                key={inq.inquiry_id}
                style={s.inquiryCard}
                testID={`admin-inquiry-${inq.inquiry_id}`}
              >
                <View style={s.inquiryHead}>
                  <Text style={s.inquiryIntent}>{inq.intent.replace('_', ' ').toUpperCase()}</Text>
                  <Text
                    style={[s.inquiryStatus, statusColor(inq.status)]}
                    testID={`inquiry-status-${inq.inquiry_id}`}
                  >
                    {inq.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={s.inquiryName}>{inq.full_name}</Text>
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${inq.email}`)}
                  hitSlop={6}
                  testID={`inquiry-email-${inq.inquiry_id}`}
                >
                  <Text style={s.inquiryEmail}>{inq.email}</Text>
                </Pressable>
                {inq.phone ? <Text style={s.inquiryMeta}>📞 {inq.phone}</Text> : null}
                {inq.company ? <Text style={s.inquiryMeta}>🏢 {inq.company}</Text> : null}
                {inq.case_title ? (
                  <Text style={s.inquiryMeta}>REF · {inq.case_title}</Text>
                ) : null}
                <View style={s.budgetRow}>
                  {inq.budget_range ? (
                    <Text style={s.budgetPill}>{inq.budget_range}</Text>
                  ) : null}
                  {inq.timeline ? (
                    <Text style={s.budgetPill}>{inq.timeline}</Text>
                  ) : null}
                </View>
                <Text style={s.inquiryMessage}>{inq.message}</Text>
                <Text style={s.inquiryDate}>
                  {new Date(inq.created_at).toLocaleString()}
                </Text>
                <Pressable
                  onPress={() => advanceStatus(inq)}
                  style={s.advanceBtn}
                  testID={`inquiry-advance-${inq.inquiry_id}`}
                >
                  <Text style={s.advanceBtnText}>
                    {nextStatusLabel(inq.status)}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function nextStatusLabel(curr: string): string {
  const idx = STATUS_FLOW.indexOf(curr);
  if (idx < 0) return 'Mark as new';
  if (idx === STATUS_FLOW.length - 1) return 'Reset to new';
  return `Mark as ${STATUS_FLOW[idx + 1]} →`;
}

function statusColor(status: string) {
  switch (status) {
    case 'new':       return { color: '#60a5fa', borderColor: 'rgba(96,165,250,0.4)' };
    case 'contacted': return { color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' };
    case 'qualified': return { color: '#a78bfa', borderColor: 'rgba(167,139,250,0.4)' };
    case 'converted': return { color: '#34d399', borderColor: 'rgba(52,211,153,0.4)' };
    case 'closed':    return { color: T.textMuted, borderColor: T.border };
    default:          return { color: T.textMuted, borderColor: T.border };
  }
}

function TabBtn({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.tabBtn, active && s.tabBtnActive]}
      testID={testID}
    >
      <Text style={[s.tabBtnText, active && s.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TogglePill({
  label,
  on,
  onPress,
  testID,
}: {
  label: string;
  on: boolean;
  onPress: (e?: any) => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.togglePill, on && s.togglePillOn]}
      testID={testID}
      hitSlop={6}
    >
      <Text style={[s.togglePillText, on && s.togglePillTextOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  backArrow: { color: T.text, fontSize: 22 },
  headerTitle: { color: T.text, fontSize: 20, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.surface,
  },
  tabBtnActive: { backgroundColor: T.primary },
  tabBtnText: { color: T.textMuted, fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: T.primaryInk },
  scroll: { flex: 1 },
  loadingBlock: { padding: 40, alignItems: 'center' },
  errorBox: {
    margin: 16,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.30)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  emptyText: { color: T.textMuted, fontSize: 13, padding: 24, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    gap: 12,
  },
  rowMain: { flex: 1 },
  rowTitle: { color: T.text, fontSize: 14, fontWeight: '700' },
  rowSub: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  rowToggles: { flexDirection: 'row', gap: 6 },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  togglePillOn: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  togglePillText: { color: T.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  togglePillTextOn: { color: T.primaryInk },

  inquiryCard: {
    backgroundColor: T.surface1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  inquiryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inquiryIntent: {
    color: T.primary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  inquiryStatus: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inquiryName: { color: T.text, fontSize: 15, fontWeight: '700' },
  inquiryEmail: { color: T.primary, fontSize: 13, marginBottom: 2 },
  inquiryMeta: { color: T.textMuted, fontSize: 12 },
  budgetRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  budgetPill: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: T.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  inquiryMessage: {
    color: T.textSecondary,
    fontSize: 13,
    marginTop: 10,
    lineHeight: 19,
  },
  inquiryDate: { color: T.textMuted, fontSize: 11, marginTop: 6 },
  advanceBtn: {
    marginTop: 10,
    backgroundColor: T.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  advanceBtnText: { color: T.primaryInk, fontSize: 13, fontWeight: '700' },
});
