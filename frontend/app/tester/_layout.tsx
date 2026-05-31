import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import T from '../../src/theme';
import { useT } from '../../src/i18n';

type IconProps = { color: string; size: number };
const HomeIcon = ({ color, size }: IconProps) => <Ionicons name="eye-outline" size={size} color={color} />;
const HistoryIcon = ({ color, size }: IconProps) => <Ionicons name="time-outline" size={size} color={color} />;

/**
 * Validator cabinet — Human Validation Layer (NOT engineering QA).
 *
 * Two tabs only:
 *   1. home    — Missions (available + my active) + credits + reputation
 *   2. history — submitted feedback + verdicts + credits earned
 *
 * Labels resolved via useT().tByEn().
 */
export default function ValidatorLayout() {
  const { tByEn } = useT();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: T.surface1, borderTopColor: T.border, height: 60, paddingBottom: 8 },
          tabBarActiveTintColor: T.primary,
          tabBarInactiveTintColor: T.textMuted,
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen name="home"    options={{ title: tByEn('Missions'), tabBarIcon: HomeIcon }} />
        <Tabs.Screen name="history" options={{ title: tByEn('History'),  tabBarIcon: HistoryIcon }} />

        {/* Hidden routes — deep-link only or legacy */}
        <Tabs.Screen name="mission/[id]"      options={{ href: null }} />
        <Tabs.Screen name="validations"       options={{ href: null }} />
        <Tabs.Screen name="validation/[id]"   options={{ href: null }} />
      </Tabs>
    </View>
  );
}
