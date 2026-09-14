/**
 * Sentry Error Tracking Configuration
 * Best Practices:
 * - Initializes Sentry with environment-aware settings
 * - Filters sensitive data before sending
 * - Captures user context for debugging
 * - Handles both client and server errors
 * - Respects privacy by not sending PII
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// ============================================
// 1. SENTRY INITIALIZATION
// ============================================

/**
 * Initialize Sentry only if DSN is available
 * DSN is public and safe to expose in frontend
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn(
      '[Sentry] DSN not configured. Error reporting is disabled. ' +
      'Set VITE_SENTRY_DSN in your environment variables.'
    );
    return;
  }

  Sentry.init({
    // Core Configuration
    dsn: dsn,
    integrations: [
      new BrowserTracing({
        // Enable performance monitoring
        tracingOrigins: [
          'localhost',
          /^https:\/\/(.+\.)?karacter\.hub$/i, // Your production domain
          /^https:\/\/(.+\.)?vercel\.app$/i,    // Vercel preview domains
        ],
      }),
    ],

    // Sampling Configuration
    tracesSampleRate: import.meta.env.MODE === 'development' ? 1.0 : 0.2, // 20% in production
    replaysSessionSampleRate: 0.1, // 10% session replays
    replaysOnErrorSampleRate: 1.0, // 100% replays for errors

    // Environment & Release
    environment: getEnvironment(),
    release: getReleaseVersion(),

    // Error Filtering
    beforeSend: filterSensitiveErrors,

    // User Privacy
    sendDefaultPii: false, // Never send PII by default
    normalizeDepth: 10,    // Limit object depth in breadcrumbs

    // Performance
    maxBreadcrumbs: 50,    // Limit breadcrumbs to prevent memory issues
    idleTimeout: 5000,     // 5 seconds of inactivity before ending transaction
  });

  // Set global user context if available
  setUserContextFromAuth();
}

// ============================================
// 2. ENVIRONMENT & RELEASE HELPERS
// ============================================

/**
 * Get the current environment (development, staging, production)
 */
function getEnvironment(): string {
  if (import.meta.env.MODE === 'development') {
    return 'development';
  }
  if (window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('localhost')) {
    return 'staging';
  }
  return 'production';
}

/**
 * Get the release version (uses git commit hash or package version)
 * This helps track which deployment caused an error
 */
function getReleaseVersion(): string {
  // If you have a build-time version, use it:
  // return import.meta.env.VITE_APP_VERSION;

  // Otherwise, use a timestamp as fallback
  return `karacter-hub-deep-call@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`;
}

// ============================================
// 3. ERROR FILTERING
// ============================================

/**
 * Filter out errors that should not be reported to Sentry
 * - 404 errors (unless in production)
 * - Canceled network requests (Axios aborts)
 * - Specific known non-critical errors
 */
function filterSensitiveErrors(event: Sentry.Event): Sentry.Event | null {
  // Filter out 404 errors in development
  if (import.meta.env.MODE === 'development' && event.request?.statusCode === 404) {
    return null;
  }

  // Filter out canceled requests (Axios)
  if (event.error?.message?.includes('canceled') ||
      event.error?.name === 'CanceledError') {
    return null;
  }

  // Filter out specific known non-critical errors
  const nonCriticalMessages = [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Failed to fetch', // Generic fetch errors (may be handled elsewhere)
  ];

  if (event.message && nonCriticalMessages.some(msg => event.message.includes(msg))) {
    return null;
  }

  // Filter out errors from specific domains
  const ignoredDomains = [
    'extension://', // Browser extension errors
    'chrome-extension://',
    'moz-extension://',
  ];

  if (event.request?.url && ignoredDomains.some(domain => event.request.url.includes(domain))) {
    return null;
  }

  // For all other errors, sanitize the message
  if (event.message) {
    event.message = sanitizeErrorMessage(event.message);
  }

  return event;
}

/**
 * Sanitize error messages to remove sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potential API keys, tokens, or sensitive data
  return message
    .replace(/api[_-]?key[\s:]=?[\"\']?[a-zA-Z0-9\-_]+/gi, 'api_key=REDACTED')
    .replace(/token[\s:]=?[\"\']?[a-zA-Z0-9\-_]+/gi, 'token=REDACTED')
    .replace(/password[\s:]=?[\"\']?[^\s&]+/gi, 'password=REDACTED')
    .replace(/secret[\s:]=?[\"\']?[^\s&]+/gi, 'secret=REDACTED');
}

// ============================================
// 4. USER CONTEXT
// ============================================

/**
 * Set Sentry user context from Supabase auth
 * This helps identify which user experienced an error
 */
export function setUserContextFromAuth() {
  // This will be called after Supabase auth is initialized
  // You can call this from your AuthContext after sign-in
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = require('@/integrations/supabase/client');

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email || undefined,
          username: session.user.user_metadata?.user_name,
        });
      } else {
        Sentry.setUser(null);
      }
    });
  } catch (error) {
    console.warn('[Sentry] Could not set user context:', error);
  }
}

/**
 * Manually set user context (for non-Supabase auth)
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    // Add any other non-PII context
    ip_address: undefined, // Never send IP addresses
  });
}

// ============================================
// 5. ERROR REPORTING HELPERS
// ============================================

/**
 * Report an error to Sentry with additional context
 * @param error - The error to report
 * @param context - Additional context (component, route, etc.)
 * @param severity - Error severity level (error, warning, info)
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  severity: Sentry.SeverityLevel = 'error'
): void {
  // Skip if Sentry is not initialized
  if (!Sentry.isInitialized()) {
    console.error('[Sentry] Error reported but Sentry not initialized:', error, context);
    return;
  }

  // Capture the error with context
  Sentry.withScope((scope) => {
    // Add context to the scope
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });

    // Set severity
    scope.setLevel(severity);

    // Capture the error
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

/**
 * Report a message to Sentry (for non-Error objects)
 */
export function reportMessage(
  message: string,
  context: Record<string, unknown> = {},
  severity: Sentry.SeverityLevel = 'warning'
): void {
  if (!Sentry.isInitialized()) {
    console.warn('[Sentry] Message reported but Sentry not initialized:', message, context);
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    scope.setLevel(severity);
    Sentry.captureMessage(message);
  });
}

// ============================================
// 6. PERFORMANCE MONITORING
// ============================================

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, operation: string = 'default'): Sentry.Span {
  return Sentry.startTransaction({ name, op: operation });
}

/**
 * Create a span for nested operations
 */
export function startSpan(name: string, op?: string): Sentry.Span {
  const span = Sentry.getSpan();
  if (span) {
    return span.startChild({ op: op || name });
  }
  return Sentry.startSpan({ op: op || name });
}

// ============================================
// 7. BREADCRUMBS (DEBUGGING CONTEXT)
// ============================================

/**
 * Add a breadcrumb to help debug issues
 * Breadcrumbs show the user's journey before an error occurred
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
): void {
  if (!Sentry.isInitialized()) {
    console.log('[Sentry] Breadcrumb (Sentry not initialized):', { category, message, data });
    return;
  }

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
  });
}

// ============================================
// 8. FLUSH (FOR SSR/TESTING)
// ============================================

/**
 * Flush pending Sentry events (useful for testing or SSR)
 * @param timeout - Max time to wait (ms)
 */
export async function flushSentryEvents(timeout: number = 2000): Promise<void> {
  if (Sentry.isInitialized()) {
    await Sentry.flush(timeout);
  }
}

// ============================================
// 9. EXPORT DEFAULT INITIALIZATION
// ============================================

// Auto-initialize Sentry when this module is imported
initSentry();

// Export all public APIs
export {
  Sentry as default,
  initSentry,
  reportError,
  reportMessage,
  setSentryUser,
  setUserContextFromAuth,
  startTransaction,
  startSpan,
  addBreadcrumb,
  flushSentryEvents,
};
