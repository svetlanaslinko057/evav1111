/**
 * Onboarding tour definitions per role.
 *
 * Each step describes:
 *   - id          unique key
 *   - target      which UI element the spotlight should land on
 *   - titleKey    i18n key (resolved at render time via useT())
 *   - bodyKey     i18n key (resolved at render time via useT())
 *   - placement   'top' (above target) | 'bottom' (below target)
 *
 * Targets use semantic coordinates the overlay resolves at runtime:
 *   { kind: 'bottom-tab', index, of }      → 5-tab layout, 0-based
 *   { kind: 'header-icon', anchor }        → 'hvl' | 'alerts' | 'chat'
 *   { kind: 'fullscreen' }                 → no spotlight, just a welcome card
 *
 * The keys themselves live in `frontend/src/i18n.tsx` under `tour.<role>.<id>.title|body`.
 * Adding a new language is a 1-line edit per key.
 */

export type TourTarget =
  | { kind: 'fullscreen' }
  | { kind: 'bottom-tab'; index: number; of: number }
  | { kind: 'header-icon'; anchor: 'hvl' | 'alerts' | 'chat' };

export interface TourStep {
  id: string;
  target: TourTarget;
  /** i18n key for the step heading. */
  titleKey: string;
  /** i18n key for the step body. */
  bodyKey: string;
  placement: 'top' | 'bottom';
}

/* ──────────────────────────── CLIENT TOUR ──────────────────────────── */

export const CLIENT_TOUR: TourStep[] = [
  {
    id: 'welcome',
    target: { kind: 'fullscreen' },
    titleKey: 'tour.client.welcome.title',
    bodyKey: 'tour.client.welcome.body',
    placement: 'bottom',
  },
  {
    id: 'tab-home',
    target: { kind: 'bottom-tab', index: 0, of: 5 },
    titleKey: 'tour.client.home.title',
    bodyKey: 'tour.client.home.body',
    placement: 'top',
  },
  {
    id: 'tab-projects',
    target: { kind: 'bottom-tab', index: 1, of: 5 },
    titleKey: 'tour.client.projects.title',
    bodyKey: 'tour.client.projects.body',
    placement: 'top',
  },
  {
    id: 'tab-activity',
    target: { kind: 'bottom-tab', index: 2, of: 5 },
    titleKey: 'tour.client.activity.title',
    bodyKey: 'tour.client.activity.body',
    placement: 'top',
  },
  {
    id: 'tab-billing',
    target: { kind: 'bottom-tab', index: 3, of: 5 },
    titleKey: 'tour.client.billing.title',
    bodyKey: 'tour.client.billing.body',
    placement: 'top',
  },
  {
    id: 'tab-profile',
    target: { kind: 'bottom-tab', index: 4, of: 5 },
    titleKey: 'tour.client.profile.title',
    bodyKey: 'tour.client.profile.body',
    placement: 'top',
  },
  {
    id: 'header-alerts',
    target: { kind: 'header-icon', anchor: 'alerts' },
    titleKey: 'tour.client.alerts.title',
    bodyKey: 'tour.client.alerts.body',
    placement: 'bottom',
  },
  {
    id: 'header-chat',
    target: { kind: 'header-icon', anchor: 'chat' },
    titleKey: 'tour.client.chat.title',
    bodyKey: 'tour.client.chat.body',
    placement: 'bottom',
  },
];

/* ────────────────────────── DEVELOPER TOUR ─────────────────────────── */
// Developer cabinet exposes a different 5-tab layout (home / market /
// acceptance / earnings / leaderboard) — wired in app/developer/_layout.tsx.

export const DEVELOPER_TOUR: TourStep[] = [
  {
    id: 'welcome',
    target: { kind: 'fullscreen' },
    titleKey: 'tour.developer.welcome.title',
    bodyKey: 'tour.developer.welcome.body',
    placement: 'bottom',
  },
  {
    id: 'tab-home',
    target: { kind: 'bottom-tab', index: 0, of: 5 },
    titleKey: 'tour.developer.home.title',
    bodyKey: 'tour.developer.home.body',
    placement: 'top',
  },
  {
    id: 'tab-market',
    target: { kind: 'bottom-tab', index: 1, of: 5 },
    titleKey: 'tour.developer.market.title',
    bodyKey: 'tour.developer.market.body',
    placement: 'top',
  },
  {
    id: 'tab-acceptance',
    target: { kind: 'bottom-tab', index: 2, of: 5 },
    titleKey: 'tour.developer.acceptance.title',
    bodyKey: 'tour.developer.acceptance.body',
    placement: 'top',
  },
  {
    id: 'tab-earnings',
    target: { kind: 'bottom-tab', index: 3, of: 5 },
    titleKey: 'tour.developer.earnings.title',
    bodyKey: 'tour.developer.earnings.body',
    placement: 'top',
  },
  {
    id: 'tab-leaderboard',
    target: { kind: 'bottom-tab', index: 4, of: 5 },
    titleKey: 'tour.developer.leaderboard.title',
    bodyKey: 'tour.developer.leaderboard.body',
    placement: 'top',
  },
  {
    id: 'header-alerts',
    target: { kind: 'header-icon', anchor: 'alerts' },
    titleKey: 'tour.developer.alerts.title',
    bodyKey: 'tour.developer.alerts.body',
    placement: 'bottom',
  },
];

/* ──────────────────────────── ADMIN TOUR ──────────────────────────── */
// Admin cabinet is dense and operates a 5-tab layout
// (home / pipeline / users / payouts / system). Tour is intentionally tight
// — 5 steps, no "decorative" cards — so power users get oriented fast.

export const ADMIN_TOUR: TourStep[] = [
  {
    id: 'welcome',
    target: { kind: 'fullscreen' },
    titleKey: 'tour.admin.welcome.title',
    bodyKey: 'tour.admin.welcome.body',
    placement: 'bottom',
  },
  {
    id: 'tab-home',
    target: { kind: 'bottom-tab', index: 0, of: 5 },
    titleKey: 'tour.admin.home.title',
    bodyKey: 'tour.admin.home.body',
    placement: 'top',
  },
  {
    id: 'tab-pipeline',
    target: { kind: 'bottom-tab', index: 1, of: 5 },
    titleKey: 'tour.admin.pipeline.title',
    bodyKey: 'tour.admin.pipeline.body',
    placement: 'top',
  },
  {
    id: 'tab-users',
    target: { kind: 'bottom-tab', index: 2, of: 5 },
    titleKey: 'tour.admin.users.title',
    bodyKey: 'tour.admin.users.body',
    placement: 'top',
  },
  {
    id: 'tab-payouts',
    target: { kind: 'bottom-tab', index: 3, of: 5 },
    titleKey: 'tour.admin.payouts.title',
    bodyKey: 'tour.admin.payouts.body',
    placement: 'top',
  },
  {
    id: 'header-alerts',
    target: { kind: 'header-icon', anchor: 'alerts' },
    titleKey: 'tour.admin.alerts.title',
    bodyKey: 'tour.admin.alerts.body',
    placement: 'bottom',
  },
];

/* ─────────────────────────── OPERATOR TOUR ─────────────────────────── */
// Operator focuses on queues — same 5-tab layout but with priorities on
// review queue, autonomy, dispatch. Kept to 5 steps.

export const OPERATOR_TOUR: TourStep[] = [
  {
    id: 'welcome',
    target: { kind: 'fullscreen' },
    titleKey: 'tour.operator.welcome.title',
    bodyKey: 'tour.operator.welcome.body',
    placement: 'bottom',
  },
  {
    id: 'tab-home',
    target: { kind: 'bottom-tab', index: 0, of: 5 },
    titleKey: 'tour.operator.home.title',
    bodyKey: 'tour.operator.home.body',
    placement: 'top',
  },
  {
    id: 'tab-queue',
    target: { kind: 'bottom-tab', index: 1, of: 5 },
    titleKey: 'tour.operator.queue.title',
    bodyKey: 'tour.operator.queue.body',
    placement: 'top',
  },
  {
    id: 'tab-autonomy',
    target: { kind: 'bottom-tab', index: 2, of: 5 },
    titleKey: 'tour.operator.autonomy.title',
    bodyKey: 'tour.operator.autonomy.body',
    placement: 'top',
  },
  {
    id: 'tab-dispatch',
    target: { kind: 'bottom-tab', index: 3, of: 5 },
    titleKey: 'tour.operator.dispatch.title',
    bodyKey: 'tour.operator.dispatch.body',
    placement: 'top',
  },
  {
    id: 'header-alerts',
    target: { kind: 'header-icon', anchor: 'alerts' },
    titleKey: 'tour.operator.alerts.title',
    bodyKey: 'tour.operator.alerts.body',
    placement: 'bottom',
  },
];

export const TOURS_BY_ROLE: Record<string, TourStep[]> = {
  client: CLIENT_TOUR,
  developer: DEVELOPER_TOUR,
  admin: ADMIN_TOUR,
  operator: OPERATOR_TOUR,
};

export function tourForRole(role: string | undefined | null): TourStep[] {
  const key = (role || 'client').toLowerCase();
  return TOURS_BY_ROLE[key] || CLIENT_TOUR;
}
