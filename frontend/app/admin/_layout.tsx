/**
 * Admin tabs — pult, not cabinet.
 *
 * 5 surfaces only: Home · QA · Validation · Finance · Profile
 *
 * Labels resolved via `useT().tByEn()` so language preference flows in.
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import T from '../../src/theme';
import { useT } from '../../src/i18n';

type IconArgs = { color: string; size: number };
const HomeIcon       = ({ color, size }: IconArgs) => <Ionicons name="pulse"            size={size} color={color} />;
const QAIcon         = ({ color, size }: IconArgs) => <Ionicons name="checkmark-circle" size={size} color={color} />;
const ValidationIcon = ({ color, size }: IconArgs) => <Ionicons name="people-circle"    size={size} color={color} />;
const FinanceIcon    = ({ color, size }: IconArgs) => <Ionicons name="cash"             size={size} color={color} />;
const ProfileIcon    = ({ color, size }: IconArgs) => <Ionicons name="person-circle"    size={size} color={color} />;

export default function AdminLayout() {
  const { tByEn } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: T.surface1, borderTopColor: T.border, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home"       options={{ title: tByEn('Home'),       tabBarLabel: tByEn('Home'),       tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="qa"         options={{ title: tByEn('QA'),         tabBarLabel: tByEn('QA'),         tabBarIcon: QAIcon }} />
      <Tabs.Screen name="validation" options={{ title: tByEn('Validation'), tabBarLabel: tByEn('Validation'), tabBarIcon: ValidationIcon }} />
      <Tabs.Screen name="finance"    options={{ title: tByEn('Finance'),    tabBarLabel: tByEn('Finance'),    tabBarIcon: FinanceIcon }} />
      <Tabs.Screen name="profile"    options={{ title: tByEn('Profile'),    tabBarLabel: tByEn('Profile'),    tabBarIcon: ProfileIcon }} />

      {/* Hidden — legacy routes kept temporarily so deep-links don't 404. */}
      <Tabs.Screen name="control" options={{ href: null }} />
      <Tabs.Screen name="projects/[id]" options={{ href: null }} />

      {/* Hidden — parity expansion screens (May 2026 / scope-freeze amendment).
          See docs/product-scope-freeze-amend-1.md → Decision 1 (amended). */}
      <Tabs.Screen name="users"            options={{ href: null }} />
      <Tabs.Screen name="team"             options={{ href: null }} />
      <Tabs.Screen name="contracts"        options={{ href: null }} />
      <Tabs.Screen name="templates"        options={{ href: null }} />
      <Tabs.Screen name="integrations"     options={{ href: null }} />
      <Tabs.Screen name="inbox"            options={{ href: null }} />
      <Tabs.Screen name="marketplace"      options={{ href: null }} />
      <Tabs.Screen name="master"           options={{ href: null }} />
      <Tabs.Screen name="execution-console" options={{ href: null }} />

      {/* PAY-V2-P5 — Operational payouts surface. Hidden from tab bar. */}
      <Tabs.Screen name="payouts"             options={{ href: null }} />
      <Tabs.Screen name="payout-batch/[batchId]" options={{ href: null }} />
      {/* PAY-V2-P4 — Reconciliation drill-down. */}
      <Tabs.Screen name="reconciliation"      options={{ href: null }} />
      {/* Portfolio — admin cases + inquiries. */}
      <Tabs.Screen name="portfolio"           options={{ href: null }} />
    </Tabs>
  );
}
