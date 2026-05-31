import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NotificationPoller from '../../src/notification-poller';
import T from '../../src/theme';
import { useT } from '../../src/i18n';

// Hoisted icon renderers — stable component identity to avoid the
// `react/no-unstable-nested-components` warning (and the wasted unmount/
// remount cycles that come with it).
type IconArgs = { color: string; size: number };
const HomeIcon     = ({ color, size }: IconArgs) => <Ionicons name="home"          size={size} color={color} />;
const ProjectsIcon = ({ color, size }: IconArgs) => <Ionicons name="folder-open"   size={size} color={color} />;
const ActivityIcon = ({ color, size }: IconArgs) => <Ionicons name="flash"         size={size} color={color} />;
const BillingIcon  = ({ color, size }: IconArgs) => <Ionicons name="card"          size={size} color={color} />;
const ProfileIcon  = ({ color, size }: IconArgs) => <Ionicons name="person-circle" size={size} color={color} />;

/**
 * Client tabs — canonical 5-tab architecture.
 *
 *   Home · Projects · Activity · Billing · Profile
 *
 * Labels are wired through `useT().tByEn()` so the same component re-renders
 * with Ukrainian labels when the user switches language in Settings.
 */
export default function ClientLayout() {
  const { tByEn } = useT();
  return (
    <View style={{ flex: 1 }}>
      <NotificationPoller />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: T.surface1,
            borderTopColor: T.border,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: T.info,
          tabBarInactiveTintColor: T.textMuted,
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen name="home"           options={{ title: tByEn('Home'),     tabBarIcon: HomeIcon }} />
        <Tabs.Screen name="projects/index" options={{ title: tByEn('Projects'), tabBarIcon: ProjectsIcon }} />
        <Tabs.Screen name="projects/[id]"  options={{ href: null }} />
        <Tabs.Screen name="activity"       options={{ title: tByEn('Activity'), tabBarIcon: ActivityIcon }} />
        <Tabs.Screen name="billing"        options={{ title: tByEn('Billing'),  tabBarIcon: BillingIcon }} />
        <Tabs.Screen name="profile"        options={{ title: tByEn('Profile'),  tabBarIcon: ProfileIcon }} />

        {/* Hidden from tab bar — kept as routable screens. */}
        <Tabs.Screen name="control" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
        <Tabs.Screen name="billing/plans" options={{ href: null }} />
        <Tabs.Screen name="modules/catalog" options={{ href: null }} />
        <Tabs.Screen name="referrals" options={{ href: null }} />
        <Tabs.Screen name="contract/[id]" options={{ href: null }} />
        <Tabs.Screen name="payment-plan/[id]" options={{ href: null }} />
        <Tabs.Screen name="deliverable/[id]" options={{ href: null }} />
        <Tabs.Screen name="versions/[project_id]" options={{ href: null }} />

        {/* HVL — accessed via AppHeader sparkles icon + Profile community
            card. Routes registered but kept out of the tab bar. */}
        <Tabs.Screen name="validation/index" options={{ href: null }} />
        <Tabs.Screen name="validation/history" options={{ href: null }} />
        <Tabs.Screen name="validation/mission/[id]" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
