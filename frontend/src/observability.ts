/**
 * Frontend error reporter — P4 Observability.
 *
 * Cheap, non-blocking forwarder that POSTs to /api/observability/client-error
 * so the backend can route to Sentry + Mongo. Designed to be safe pre-auth
 * (the backend accepts anonymous reports) and to never throw.
 */

const BACKEND = (process.env.EXPO_PUBLIC_BACKEND_URL as string | undefined) || '';

const APP_RELEASE =
  (process.env.EXPO_PUBLIC_RELEASE as string | undefined) || 'preview';

const PLATFORM = (() => {
  try {
    // typeof check avoids RN warnings on Hermes
    if (typeof window !== 'undefined' && typeof document !== 'undefined') return 'web';
  } catch {}
  return 'expo';
})();

type ReportInput = {
  kind?: 'render_error' | 'promise_rejection' | 'network_error' | 'manual';
  message?: string;
  stack?: string;
  url?: string;
  context?: Record<string, unknown>;
};

// In-memory dedupe — same message+stack within 10s is suppressed.
const recent = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10_000;

let installed = false;

export function reportClientError(payload: ReportInput): void {
  try {
    const key = `${payload.kind || ''}::${payload.message || ''}::${(payload.stack || '').slice(0, 200)}`;
    const now = Date.now();
    const lastSeen = recent.get(key);
    if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) return;
    recent.set(key, now);
    if (recent.size > 64) {
      // crude eviction
      for (const k of Array.from(recent.keys()).slice(0, 32)) recent.delete(k);
    }

    const body = {
      kind: payload.kind || 'manual',
      message: (payload.message || '').slice(0, 2000),
      stack: payload.stack ? payload.stack.slice(0, 20000) : null,
      url: payload.url || (typeof window !== 'undefined' && (window as any)?.location?.href) || null,
      user_agent:
        (typeof navigator !== 'undefined' && navigator?.userAgent) || null,
      release: APP_RELEASE,
      platform: PLATFORM,
      context: payload.context || {},
    };

    if (!BACKEND) return;
    fetch(`${BACKEND}/api/observability/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).catch(() => undefined);
  } catch {
    /* best-effort, never throw */
  }
}

/**
 * Install global handlers for uncaught errors + unhandled promise rejections.
 * Idempotent — calling multiple times is a no-op after the first.
 */
export function installGlobalErrorReporter(): void {
  if (installed) return;
  installed = true;

  try {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('error', (ev: any) => {
        reportClientError({
          kind: 'render_error',
          message: (ev?.message || ev?.error?.message || 'window.error') as string,
          stack: ev?.error?.stack,
        });
      });
      window.addEventListener('unhandledrejection', (ev: any) => {
        const reason = ev?.reason;
        reportClientError({
          kind: 'promise_rejection',
          message:
            typeof reason === 'string'
              ? reason
              : reason?.message || 'unhandled promise rejection',
          stack: reason?.stack,
        });
      });
    }
  } catch {
    /* best-effort */
  }
}
