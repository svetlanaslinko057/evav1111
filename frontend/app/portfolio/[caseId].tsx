/**
 * /portfolio/[caseId] — public detail page for a portfolio case.
 *
 * Layout:
 *   - Hero image
 *   - Title + industry/client meta
 *   - Meta sidebar (stacked on mobile): hours, team_size, dates, budget/starting_from, tech stack
 *   - Case study (long form) + challenge + solution
 *   - Gallery (horizontal scroll)
 *   - Tags chips
 *   - Results + testimonial
 *   - External URL (if shareable)
 *   - 3 CTAs: Order similar · Free consultation · Calculate this project
 */
import { useEffect, useState, useCallback } from 'react';
import { Text } from '@/src/i18n-text';
import { View, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/api';
import T from '../../src/theme';
import PortfolioInquiryModal, { type InquiryIntent } from '../../src/portfolio-inquiry-modal';

interface PortfolioCase {
  case_id: string;
  title: string;
  description: string;
  client_name: string;
  industry: string;
  product_type: string;
  technologies: string[];
  results: string;
  testimonial?: string | null;
  image_url?: string | null;
  budget?: number | null;
  show_budget?: boolean;
  show_description?: boolean;
  status?: string;
  quality_score?: number | null;
  duration_weeks?: number | null;
  featured?: boolean;
  published?: boolean;
  gallery: string[];
  external_url?: string | null;
  case_study?: string | null;
  hours_spent?: number | null;
  team_size?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  tags: string[];
  challenge?: string | null;
  solution?: string | null;
  cta_headline?: string | null;
  starting_from?: number | null;
}

export default function PortfolioDetailScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PortfolioCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [intent, setIntent] = useState<InquiryIntent>('order_similar');

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await api.get<PortfolioCase>(`/portfolio/cases/${caseId}`);
      setData(r.data);
    } catch (err: any) {
      setError(err?.message || 'Could not load case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId) load();
  }, [caseId, load]);

  const openModal = (newIntent: InquiryIntent) => {
    setIntent(newIntent);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingBlock}>
          <ActivityIndicator size="small" color={T.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorBlock}>
          <Text style={s.errorTitle}>Case not found</Text>
          <Text style={s.errorBody}>{error || 'This case is no longer published.'}</Text>
          <Pressable onPress={() => router.back()} style={s.backCTA} testID="detail-go-back">
            <Text style={s.backCTAText}>← Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const showBudget = data.show_budget === true && (data.budget || data.starting_from);
  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };
  const dateRange =
    formatDate(data.start_date) && formatDate(data.end_date)
      ? `${formatDate(data.start_date)} → ${formatDate(data.end_date)}`
      : null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} testID="portfolio-detail-screen">
        {/* Back nav */}
        <View style={s.topNav}>
          <Pressable
            onPress={() => router.back()}
            style={s.backBtn}
            testID="detail-back"
            hitSlop={12}
          >
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>Back to portfolio</Text>
          </Pressable>
        </View>

        {/* Hero */}
        {data.image_url ? (
          <Image source={{ uri: data.image_url }} style={s.hero} resizeMode="cover" />
        ) : (
          <View style={[s.hero, s.heroPlaceholder]}>
            <Text style={s.heroPlaceholderText}>{data.industry?.[0] || '·'}</Text>
          </View>
        )}

        {/* Title block */}
        <View style={s.titleBlock}>
          <View style={s.metaRow}>
            <Text style={s.industry}>{data.industry.toUpperCase()}</Text>
            {data.status ? (
              <Text style={s.statusPill}>{data.status.toUpperCase()}</Text>
            ) : null}
          </View>
          <Text style={s.title} testID="detail-title">
            {data.title}
          </Text>
          <Text style={s.client}>for {data.client_name}</Text>
          {data.show_description !== false && (
            <Text style={s.description}>{data.description}</Text>
          )}
        </View>

        {/* Meta sidebar — stacked grid */}
        <View style={s.metaGrid}>
          {data.hours_spent ? (
            <MetaCell label="Engineering hours" value={`${data.hours_spent.toLocaleString()}h`} />
          ) : null}
          {data.team_size ? (
            <MetaCell label="Team size" value={`${data.team_size}`} />
          ) : null}
          {data.duration_weeks ? (
            <MetaCell label="Duration" value={`${data.duration_weeks} weeks`} />
          ) : null}
          {dateRange ? <MetaCell label="Timeline" value={dateRange} /> : null}
          {showBudget && data.budget ? (
            <MetaCell label="Budget" value={`$${data.budget.toLocaleString()}`} />
          ) : null}
          {data.quality_score ? (
            <MetaCell label="Quality score" value={`${data.quality_score}/100`} />
          ) : null}
        </View>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <View style={s.tagRow}>
            {data.tags.map((t, i) => (
              <View key={`${t}-${i}`} style={s.tagChip}>
                <Text style={s.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Challenge / Solution */}
        {data.challenge ? (
          <Section title="The challenge">
            <Text style={s.body}>{data.challenge}</Text>
          </Section>
        ) : null}

        {data.solution ? (
          <Section title="Our solution">
            <Text style={s.body}>{data.solution}</Text>
          </Section>
        ) : null}

        {/* Case study */}
        {data.case_study ? (
          <Section title="Case study">
            <Text style={s.body}>{data.case_study}</Text>
          </Section>
        ) : null}

        {/* Tech stack */}
        {data.technologies && data.technologies.length > 0 && (
          <Section title="Tech stack">
            <View style={s.techRow}>
              {data.technologies.map((t, i) => (
                <View key={`${t}-${i}`} style={s.techChip}>
                  <Text style={s.techText}>{t}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Gallery */}
        {data.gallery && data.gallery.length > 0 && (
          <Section title="More screens">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gallery}>
              {data.gallery.map((url, i) => (
                <Image
                  key={`${url}-${i}`}
                  source={{ uri: url }}
                  style={s.galleryItem}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Results */}
        {data.results ? (
          <Section title="Results">
            <View style={s.resultsBox}>
              <Text style={s.resultsText}>{data.results}</Text>
            </View>
          </Section>
        ) : null}

        {/* Testimonial */}
        {data.testimonial ? (
          <Section title="Client testimonial">
            <View style={s.testimonialBox}>
              <Text style={s.testimonialQuote}>“{data.testimonial}”</Text>
              <Text style={s.testimonialAttr}>— {data.client_name}</Text>
            </View>
          </Section>
        ) : null}

        {/* External link */}
        {data.external_url ? (
          <Pressable
            onPress={() => data.external_url && Linking.openURL(data.external_url)}
            style={s.externalLink}
            testID="detail-external-link"
          >
            <Text style={s.externalLinkText}>Visit live product →</Text>
          </Pressable>
        ) : null}

        {/* Upsell block — 3 CTAs */}
        <View style={s.upsellBlock}>
          <Text style={s.upsellEyebrow}>UPSELL</Text>
          <Text style={s.upsellHeadline}>
            {data.cta_headline || `Want a project like ${data.title}?`}
          </Text>
          {data.starting_from ? (
            <Text style={s.upsellPrice}>
              Similar projects start from{' '}
              <Text style={s.upsellPriceStrong}>${Number(data.starting_from).toLocaleString()}</Text>
            </Text>
          ) : (
            <Text style={s.upsellPrice}>Get a structured proposal in &lt;24h.</Text>
          )}

          <Pressable
            onPress={() => openModal('order_similar')}
            style={s.ctaPrimary}
            testID="cta-order-similar"
          >
            <Text style={s.ctaPrimaryText}>Order a similar project</Text>
            <Text style={s.ctaPrimaryArrow}>→</Text>
          </Pressable>

          <View style={s.ctaRow}>
            <Pressable
              onPress={() => openModal('consultation')}
              style={s.ctaSecondary}
              testID="cta-consultation"
            >
              <Text style={s.ctaSecondaryEyebrow}>FREE</Text>
              <Text style={s.ctaSecondaryText}>Consultation</Text>
            </Pressable>
            <Pressable
              onPress={() => openModal('calculate')}
              style={s.ctaSecondary}
              testID="cta-calculate"
            >
              <Text style={s.ctaSecondaryEyebrow}>INSTANT</Text>
              <Text style={s.ctaSecondaryText}>Calculate this</Text>
            </Pressable>
          </View>
          <Text style={s.upsellFineprint}>
            No commitment. We respond in under 24 hours.
          </Text>
        </View>
      </ScrollView>

      <PortfolioInquiryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        caseId={data.case_id}
        caseTitle={data.title}
        intent={intent}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 60 },
  loadingBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorBlock: { padding: 40, alignItems: 'center', flex: 1, justifyContent: 'center' },
  errorTitle: { color: T.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errorBody: { color: T.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  backCTA: { padding: 12 },
  backCTAText: { color: T.primary, fontSize: 14, fontWeight: '600' },
  topNav: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  backArrow: { color: T.text, fontSize: 20 },
  backLabel: { color: T.textMuted, fontSize: 13, fontWeight: '500' },
  hero: { width: '100%', height: 240, backgroundColor: T.surface },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderText: { color: T.textMuted, fontSize: 80, fontWeight: '300' },
  titleBlock: { padding: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  industry: {
    color: T.primary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  statusPill: {
    color: T.textMuted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  title: { color: T.text, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  client: { color: T.textMuted, fontSize: 14, marginTop: 6 },
  description: { color: T.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 14 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  metaCell: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: T.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  metaLabel: {
    color: T.textMuted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: { color: T.text, fontSize: 16, fontWeight: '700' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  tagChip: {
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: T.textMuted, fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  body: { color: T.textSecondary, fontSize: 14, lineHeight: 22 },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  techChip: {
    backgroundColor: T.primaryBg || T.surface,
    borderColor: T.primaryBorder || T.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  techText: { color: T.primary, fontSize: 11, fontWeight: '600' },
  gallery: { paddingTop: 4 },
  galleryItem: {
    width: 280,
    height: 180,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: T.surface,
  },
  resultsBox: {
    backgroundColor: T.successBg || T.surface1,
    borderColor: T.successBorder || T.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  resultsText: { color: T.success || T.text, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  testimonialBox: {
    backgroundColor: T.surface1,
    borderLeftWidth: 3,
    borderLeftColor: T.primary,
    padding: 14,
    borderRadius: 8,
  },
  testimonialQuote: { color: T.text, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  testimonialAttr: { color: T.textMuted, fontSize: 12, marginTop: 8 },
  externalLink: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: T.surface1,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  externalLinkText: { color: T.primary, fontSize: 14, fontWeight: '700' },
  upsellBlock: {
    marginHorizontal: 16,
    marginTop: 36,
    padding: 20,
    backgroundColor: T.surface1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.primaryBorder || T.border,
  },
  upsellEyebrow: {
    color: T.primary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 6,
  },
  upsellHeadline: { color: T.text, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  upsellPrice: { color: T.textMuted, fontSize: 13, marginTop: 6, marginBottom: 18 },
  upsellPriceStrong: { color: T.text, fontWeight: '700' },
  ctaPrimary: {
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPrimaryText: { color: T.primaryInk, fontSize: 15, fontWeight: '700' },
  ctaPrimaryArrow: { color: T.primaryInk, fontSize: 20, fontWeight: '700' },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  ctaSecondary: {
    flex: 1,
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ctaSecondaryEyebrow: {
    color: T.primary,
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '700',
    marginBottom: 4,
  },
  ctaSecondaryText: { color: T.text, fontSize: 14, fontWeight: '700' },
  upsellFineprint: { color: T.textMuted, fontSize: 11, marginTop: 14, textAlign: 'center' },
});
