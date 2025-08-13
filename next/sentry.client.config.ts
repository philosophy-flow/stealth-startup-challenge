import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust traces sample rate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: false, // Disabled to reduce console noise

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Session Replay configuration
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
  replaysOnErrorSampleRate: 1.0, // 100% of sessions when errors occur

  // Integrations
  integrations: [
    // Browser Tracing
    Sentry.browserTracingIntegration(),
    
    // Session Replay
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      // Mask all inputs for privacy
      maskAllInputs: true,
    }),
  ],

  // Ignore certain errors
  ignoreErrors: [
    // Browser errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    // Network errors that are usually not actionable
    /Failed to fetch/i,
    /NetworkError/i,
    /Load failed/i,
    // Third-party errors
    'top.GLOBALS',
    // Random browser extensions
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
  ],

  // Before sending event to Sentry
  beforeSend(event, _hint) {
    // In development, log events to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sentry] Captured event:', event.message || event.exception?.values?.[0]?.type || 'Unknown event')
    }

    // Filter out certain URLs
    if (event.request?.url) {
      const url = event.request.url
      // Don't track chrome extension errors
      if (url.includes('chrome-extension://') || url.includes('moz-extension://')) {
        return null
      }
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        // Remove phone numbers from breadcrumb data
        if (breadcrumb.data) {
          Object.keys(breadcrumb.data).forEach(key => {
            if (typeof breadcrumb.data![key] === 'string') {
              breadcrumb.data![key] = breadcrumb.data![key].replace(
                /\+?[1-9]\d{1,14}/g,
                '[PHONE]'
              )
            }
          })
        }
        return breadcrumb
      })
    }

    return event
  },

  // Breadcrumb configuration
  beforeBreadcrumb(breadcrumb, _hint) {
    // Filter out certain breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null // Don't track debug console logs
    }

    // Add timestamp to all breadcrumbs
    breadcrumb.timestamp = breadcrumb.timestamp || Date.now() / 1000

    return breadcrumb
  },
})