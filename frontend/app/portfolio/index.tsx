/**
 * /portfolio — public list of delivered cases. Tap → detail page.
 */
import { useEffect, useState, useCallback } from 'react';
import { Text } from '@/src/i18n-text';
import { View, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/api';
import T from '../../src/theme';

interface PortfolioCase {
  case_id: string;
  title: string;
  description: string;
  client_name: string;
  industry: string;
  product_type: string;
  technologies: string[];
  results: string;
  image_url?: string | null;
  budget?: number | null;
  show_budget?: boolean;
  show_description?: boolean;
  status?: string;
  duration_weeks?: number | null;
  featured?: boolean;
  tags?: string[];
  starting_from?: number | null;
}

export default function PortfolioListScreen() {
  const router = useRouter();
  const [cases, setCases] = useState<PortfolioCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await api.get<PortfolioCase[]>('/portfolio/cases');
      setCases(r.data || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load portfolio');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        testID="portfolio-list-screen"
      >
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={s.backBtn}
            testID="portfolio-back"
            hitSlop={12}
          >
            <Text style={s.backArrow}>←</Text>
          </Pressable>
          <Text style={s.eyebrow}>OUR WORK</Text>
          <Text style={s.headline}>Real products. Shipped, supported, scaled.</Text>
          <Text style={s.subhead}>
            Each case is a fixed-scope contract delivered by our platform team. Tap to see the full breakdown.
          </Text>
        </View>

        {loading && (
          <View style={s.loadingBlock}>
            <ActivityIndicator size="small" color={T.primary} />
          </View>
        )}

        {!loading && error ? (
          <View style={s.errorBlock}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && cases.length === 0 ? (
          <View style={s.emptyBlock}>
            <Text style={s.emptyText}>No cases published yet.</Text>
          </View>
        ) : null}

        <View style={s.list}>
          {cases.map((c, idx) => (
            <Pressable
              key={c.case_id}
              onPress={() => router.push(`/portfolio/${c.case_id}` as any)}
              style={({ pressed }) => [s.card, pressed && s.cardPressed]}
              testID={`portfolio-card-${idx}`}
            >
              {c.image_url ? (
                <Image source={{ uri: c.image_url }} style={s.cardImage} resizeMode="cover" />
              ) : (
                <View style={[s.cardImage, s.cardImagePlaceholder]}>
                  <Text style={s.cardImagePlaceholderText}>{c.industry?.[0] || '·'}</Text>
                </View>
              )}
              <View style={s.cardBody}>
                <View style={s.cardMetaRow}>
                  <Text style={s.cardIndustry}>{c.industry.toUpperCase()}</Text>
                  {c.featured ? <Text style={s.cardFeatured}>FEATURED</Text> : null}
                </View>
                <Text style={s.cardTitle}>{c.title}</Text>
                {c.show_description !== false && (
                  <Text style={s.cardDesc} numberOfLines={2}>
                    {c.description}
                  </Text>
                )}
                <View style={s.cardFooter}>
                  <Text style={s.cardClient}>{c.client_name}</Text>
                  {c.starting_from ? (
                    <Text style={s.cardPrice}>from ${Number(c.starting_from).toLocaleString()}</Text>
                  ) : c.duration_weeks ? (
                    <Text style={s.cardPrice}>{c.duration_weeks} weeks</Text>
                  ) : null}
                </View>
              </View>
              <View style={s.cardChevron}>
                <Text style={s.cardChevronText}>→</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  backBtn: { paddingVertical: 8, paddingRight: 12, alignSelf: 'flex-start' },
  backArrow: { color: T.text, fontSize: 22 },
  eyebrow: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  headline: { color: T.text, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  subhead: { color: T.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  loadingBlock: { paddingVertical: 40, alignItems: 'center' },
  errorBlock: { padding: 20 },
  errorText: { color: T.textMuted, fontSize: 13 },
  emptyBlock: { padding: 40, alignItems: 'center' },
  emptyText: { color: T.textMuted, fontSize: 14 },
  list: { paddingHorizontal: 16, gap: 14 },
  card: {
    backgroundColor: T.surface1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  cardPressed: { opacity: 0.86 },
  cardImage: { width: '100%', height: 180, backgroundColor: T.surface },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardImagePlaceholderText: { color: T.textMuted, fontSize: 48, fontWeight: '300' },
  cardBody: { padding: 16 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardIndustry: {
    color: T.primary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  cardFeatured: {
    color: T.text,
    backgroundColor: T.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '700',
    overflow: 'hidden',
  },
  cardTitle: { color: T.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  cardDesc: { color: T.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingRight: 52,
  },
  cardClient: { color: T.textSecondary, fontSize: 12, fontWeight: '500' },
  cardPrice: { color: T.primary, fontSize: 12, fontWeight: '700' },
  cardChevron: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    })
  },
  cardChevronText: { color: T.primaryInk, fontSize: 17, fontWeight: '700', lineHeight: 18 },
});
