/**
 * Onboarding Tour Engine — first-login coachmarks for the mobile cabinet.
 *
 * Visual model (matches the user reference):
 *   • A dim overlay (rgba black) covers the whole screen.
 *   • A "spotlight" rectangle is punched out around the current target,
 *     leaving the actual UI element fully visible while the rest dims.
 *   • A pointer + tooltip card appears above OR below the spotlight, with
 *     the step title, body copy, a "step N of M" indicator and
 *     [Skip · Next] / [Skip · Finish] buttons.
 *
 * We don't depend on measuring real refs (Tabs from expo-router don't expose
 * them cleanly). Instead each step describes its target semantically
 * ({kind:'bottom-tab',index,of} / {kind:'header-icon',anchor}) and the
 * overlay computes pixel-perfect spotlight coordinates from
 * Dimensions + the safe-area insets it already knows about.
 *
 * Backend wiring:
 *   • GET  /api/onboarding/tour-state           → should we run the tour?
 *   • POST /api/onboarding/tour-complete        → mark done (on finish OR skip)
 *   • POST /api/onboarding/tour-reset           → manual replay (Profile)
 *
 * Local cache layer (`atlas_tour_seen_<role>`) is the source of truth on
 * device — backend is the source of truth across devices. We respect EITHER
 * to suppress the tour.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { storage } from './utils/storage';
import api from './api';
import { useAuth } from './auth';
import T from './theme';
import { tourForRole, TourStep, TourTarget } from './onboarding-tours';
import { useT } from './i18n';

/* ─────────────────── geometry ─────────────────── */

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TAB_BAR_HEIGHT = 60;
// Mirror real geometry from `src/app-header.tsx`. Icon buttons are
// `padding: 4` around a `size:22` Ionicon (= 30×30 hit area). The right
// cluster has `gap: 14` between icons and the row uses `paddingHorizontal: T.md`
// (= 16). The header row height is 48 and is vertically centered, so each
// icon's top sits at `insets.top + 9` (= (48 - 30) / 2 + insets.top adjusted
// for the container's `paddingTop: Math.max(insets.top, 8)`).
const HEADER_ICON_SIZE = 30;
const HEADER_ICON_GAP = 14;
const HEADER_ROW_HEIGHT = 48;
const HEADER_RIGHT_PAD = 16;

function resolveSpotlight(
  target: TourTarget,
  screen: { width: number; height: number },
  insets: { top: number; bottom: number; left: number; right: number },
): SpotlightRect | null {
  if (target.kind === 'fullscreen') return null;

  if (target.kind === 'bottom-tab') {
    const { index, of } = target;
    const w = screen.width / of;
    const x = w * index;
    const tabBottom = insets.bottom + TAB_BAR_HEIGHT;
    const y = screen.height - tabBottom;
    return { x: x + 4, y: y + 2, width: w - 8, height: TAB_BAR_HEIGHT - 4 };
  }

  if (target.kind === 'header-icon') {
    // Right cluster order (rightmost first): chat · alerts · hvl
    // i.e. chat = 0 from right, alerts = 1, hvl = 2
    const orderFromRight: Record<string, number> = { chat: 0, alerts: 1, hvl: 2 };
    const idx = orderFromRight[target.anchor] ?? 1;
    const right =
      HEADER_RIGHT_PAD + idx * (HEADER_ICON_SIZE + HEADER_ICON_GAP);
    const x = screen.width - right - HEADER_ICON_SIZE;
    // Vertically centre the icon inside the 48px header row, accounting for
    // the safe-area `paddingTop: max(insets.top, 8)` applied by the header.
    const headerPaddingTop = Math.max(insets.top, 8);
    const y = headerPaddingTop + (HEADER_ROW_HEIGHT - HEADER_ICON_SIZE) / 2;
    return { x, y, width: HEADER_ICON_SIZE, height: HEADER_ICON_SIZE };
  }

  return null;
}

/* ─────────────────── context ─────────────────── */

interface TourContextValue {
  active: boolean;
  start: (force?: boolean) => void;
  skip: () => void;
  next: () => void;
  prev: () => void;
  finish: () => void;
  /**
   * Manual replay — clears local + server "seen" flags and re-fires the
   * tour from step 0. Used by the "Replay tour" row in Profile.
   */
  replay: () => Promise<void>;
  currentIndex: number;
  steps: TourStep[];
  role: string;
  hasTour: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useOnboardingTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    return {
      active: false,
      start: () => {},
      skip: () => {},
      next: () => {},
      prev: () => {},
      finish: () => {},
      replay: async () => {},
      currentIndex: 0,
      steps: [],
      role: 'client',
      hasTour: false,
    };
  }
  return ctx;
}

/* ─────────────────── provider ─────────────────── */

export function OnboardingTourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const role = (user?.role || 'client').toLowerCase();
  const steps = useMemo(() => tourForRole(role), [role]);

  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const startedRef = useRef(false);

  const localKey = `atlas_tour_seen_${role}`;

  /** Manually start (used by Profile → "Replay tour" and by auto-trigger). */
  const start = useCallback(
    (force = false) => {
      if (!steps.length) return;
      if (!force && startedRef.current) return;
      startedRef.current = true;
      setCurrentIndex(0);
      setActive(true);
    },
    [steps.length],
  );

  const markServerComplete = useCallback(
    async (skipped: boolean, atIndex?: number) => {
      try {
        await storage.setItem(localKey, '1');
      } catch {
        /* ignore */
      }
      try {
        await api.post('/onboarding/tour-complete', {
          role,
          skipped,
          // 0-based index of the step the user was on when finishing/skipping.
          skipped_at_step: typeof atIndex === 'number' ? atIndex : undefined,
          total_steps: steps.length,
        });
      } catch {
        /* silently fail — local flag still prevents re-show */
      }
    },
    [localKey, role, steps.length],
  );

  const finish = useCallback(() => {
    setActive(false);
    void markServerComplete(false, steps.length - 1);
  }, [markServerComplete, steps.length]);

  const skip = useCallback(() => {
    setActive(false);
    void markServerComplete(true, currentIndex);
  }, [markServerComplete, currentIndex]);

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      if (i + 1 >= steps.length) {
        setActive(false);
        void markServerComplete(false, steps.length - 1);
        return i;
      }
      return i + 1;
    });
  }, [steps.length, markServerComplete]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  /**
   * Manual replay — clears local cache, asks the backend to flip
   * `users.onboarding_tours.tour_seen_<role>` back to false, then re-fires
   * the tour from step 0. Used by the "Replay tour" row in Profile.
   * Resolves regardless of network errors so the UX never blocks.
   */
  const replay = useCallback(async () => {
    try {
      await storage.removeItem(localKey);
    } catch {
      /* ignore */
    }
    try {
      await api.post('/onboarding/tour-reset', { role });
    } catch {
      /* ignore — local replay still works */
    }
    startedRef.current = false;
    setCurrentIndex(0);
    setActive(true);
    startedRef.current = true;
  }, [localKey, role]);

  /** Auto-trigger after first login. */
  useEffect(() => {
    if (!user) return;
    if (active || startedRef.current) return;
    let cancelled = false;

    (async () => {
      // Local cache first (cheap)
      try {
        const local = await storage.getItem(localKey);
        if (local && local === '1') return;
      } catch {
        /* ignore */
      }
      // Server check (authoritative across devices)
      try {
        const r = await api.get('/onboarding/tour-state');
        if (cancelled) return;
        if (r.data?.should_show) {
          // Defer slightly so the home screen has time to lay out — the
          // tooltip sits next to tabs/header which need a frame to render.
          setTimeout(() => {
            if (!cancelled) start();
          }, 1100);
        }
      } catch {
        /* ignore — no harm in skipping */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, active, localKey, start]);

  const value: TourContextValue = {
    active,
    start,
    skip,
    next,
    prev,
    finish,
    replay,
    currentIndex,
    steps,
    role,
    hasTour: steps.length > 0,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && steps.length > 0 ? (
        <OnboardingTourOverlay
          step={steps[currentIndex]}
          index={currentIndex}
          total={steps.length}
          onNext={next}
          onSkip={skip}
          onPrev={prev}
        />
      ) : null}
    </TourContext.Provider>
  );
}

/* ─────────────────── overlay ─────────────────── */

interface OverlayProps {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onPrev: () => void;
}

function OnboardingTourOverlay({ step, index, total, onNext, onSkip, onPrev }: OverlayProps) {
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('window');
  const spot = useMemo(() => resolveSpotlight(step.target, screen, insets), [step.target, screen, insets]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  useEffect(() => {
    if (!spot) return;
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [spot, pulseAnim, index]);

  const isLast = index === total - 1;
  const isFirst = index === 0;
  const isFullscreen = step.target.kind === 'fullscreen';

  return (
    <Animated.View
      style={[s.overlayRoot, { opacity: fadeAnim }]}
      style={{ pointerEvents: 'auto' }}
      testID="onboarding-tour-overlay"
    >
      {/* Dim mask — full screen if fullscreen step, or 4 rectangles around
          the spotlight otherwise. */}
      {isFullscreen || !spot ? (
        <View style={[s.dim, StyleSheet.absoluteFill]} />
      ) : (
        <>
          <View style={[s.dim, { top: 0, left: 0, right: 0, height: spot.y }]} />
          <View
            style={[
              s.dim,
              { top: spot.y + spot.height, left: 0, right: 0, bottom: 0 },
            ]}
          />
          <View
            style={[
              s.dim,
              { top: spot.y, left: 0, width: spot.x, height: spot.height },
            ]}
          />
          <View
            style={[
              s.dim,
              {
                top: spot.y,
                left: spot.x + spot.width,
                right: 0,
                height: spot.height,
              },
            ]}
          />

          {/* Spotlight ring — a glowing border around the target. */}
          <Animated.View
            style={{ pointerEvents: 'none' }}
            style={[
              s.spotlightRing,
              {
                top: spot.y - 4,
                left: spot.x - 4,
                width: spot.width + 8,
                height: spot.height + 8,
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.95] }),
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.0, 1.06],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      {/* Tooltip card */}
      <TourTooltip
        step={step}
        spot={spot}
        index={index}
        total={total}
        screen={screen}
        insets={insets}
        isFirst={isFirst}
        isLast={isLast}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
      />
    </Animated.View>
  );
}

/* ─────────────────── tooltip card ─────────────────── */

interface TooltipProps {
  step: TourStep;
  spot: SpotlightRect | null;
  index: number;
  total: number;
  screen: { width: number; height: number };
  insets: { top: number; bottom: number; left: number; right: number };
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TourTooltip({
  step,
  spot,
  index,
  total,
  screen,
  insets,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onSkip,
}: TooltipProps) {
  const { t } = useT();
  const isFullscreen = step.target.kind === 'fullscreen' || !spot;

  // Tooltip placement
  let tooltipStyle: any;
  let pointerStyle: any = null;
  if (isFullscreen) {
    tooltipStyle = {
      top: screen.height / 2 - 120,
      left: 20,
      right: 20,
    };
  } else if (step.placement === 'top') {
    // Tooltip above the target — typical for bottom tabs.
    tooltipStyle = {
      bottom: screen.height - spot!.y + 16,
      left: 16,
      right: 16,
    };
    pointerStyle = {
      bottom: screen.height - spot!.y + 4,
      left: spot!.x + spot!.width / 2 - 7,
      transform: [{ rotate: '180deg' }],
    };
  } else {
    // Tooltip below the target — typical for header icons.
    tooltipStyle = {
      top: spot!.y + spot!.height + 16,
      left: 16,
      right: 16,
    };
    pointerStyle = {
      top: spot!.y + spot!.height + 4,
      left: spot!.x + spot!.width / 2 - 7,
    };
  }

  return (
    <>
      {pointerStyle ? (
        <View style={[[s.pointer, pointerStyle], { pointerEvents: 'none' }]} />
      ) : null}

      <View style={[s.tooltip, tooltipStyle]} testID="onboarding-tour-tooltip">
        <View style={s.tooltipHeader}>
          <View style={s.stepDots}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={[s.stepDot, i === index ? s.stepDotActive : null]}
              />
            ))}
          </View>
          <TouchableOpacity
            testID="onboarding-tour-skip"
            onPress={onSkip}
            hitSlop={10}
            style={s.skipBtn}
          >
            <Ionicons name="close" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={s.tooltipTitle} testID="onboarding-tour-title">
          {t(step.titleKey)}
        </Text>
        <Text style={s.tooltipBody} testID="onboarding-tour-body">
          {t(step.bodyKey)}
        </Text>

        <View style={s.tooltipFooter}>
          <Text style={s.stepCounter}>
            {t('tour.ui.step_counter')
              .replace('{n}', String(index + 1))
              .replace('{total}', String(total))}
          </Text>
          <View style={s.btnRow}>
            {!isFirst ? (
              <TouchableOpacity
                testID="onboarding-tour-prev"
                onPress={onPrev}
                style={s.secondaryBtn}
              >
                <Text style={s.secondaryBtnText}>{t('tour.ui.back')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              testID="onboarding-tour-next"
              onPress={onNext}
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText}>
                {isLast ? t('tour.ui.got_it') : t('tour.ui.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isFirst ? (
          <TouchableOpacity
            testID="onboarding-tour-skip-tour"
            onPress={onSkip}
            style={s.skipTourLink}
          >
            <Text style={s.skipTourLinkText}>{t('tour.ui.skip')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
}

/* ─────────────────── styles ─────────────────── */

const s = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(8, 11, 16, 0.72)',
  },
  spotlightRing: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: T.primary,
    backgroundColor: 'transparent',
    ...Platform.select({ web: { boxShadow: '0px 2px 14px rgba(0,0,0,0.8)' }, default: { shadowColor: T.primary, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 2 } } }),
    ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 22px ${T.primary}` } as any) : {}),
  },
  pointer: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: T.surface1,
    borderColor: T.border,
    borderWidth: 1,
    transform: [{ rotate: '0deg' }],
    // Visual triangle hint — using a square rotated; on top/bottom we already
    // rotate via pointerStyle. Keep simple to avoid clip overhead.
    borderRadius: 2,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: T.surface1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    ...Platform.select({ web: { boxShadow: '0px 2px 24px rgba(0,0,0,0.32)' }, default: { shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 2 }, elevation: 24 } }),
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 14px 32px rgba(0,0,0,0.32)' } as any) : {}),
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepDots: { flexDirection: 'row', gap: 5 },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.border,
  },
  stepDotActive: {
    backgroundColor: T.primary,
    width: 20,
  },
  skipBtn: { padding: 4 },
  tooltipTitle: {
    color: T.text,
    fontSize: T.h3 ?? 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  tooltipBody: {
    color: T.textSecondary,
    fontSize: T.body ?? 15,
    lineHeight: 22,
  },
  tooltipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepCounter: {
    color: T.textMuted,
    fontSize: T.tiny ?? 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface2,
  },
  secondaryBtnText: { color: T.text, fontWeight: '700', fontSize: T.small ?? 14 },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: T.primary,
  },
  primaryBtnText: { color: T.bg, fontWeight: '800', fontSize: T.small ?? 14 },
  skipTourLink: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  skipTourLinkText: {
    color: T.textMuted,
    fontSize: T.tiny ?? 12,
    textDecorationLine: 'underline',
  },
});
