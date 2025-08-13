import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust traces sample rate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Debug mode for development
  debug: false, // Disabled to reduce console noise

  // Before sending event to Sentry
  beforeSend(event, _hint) {
    // In development, log events to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sentry Edge] Captured event:', event.message || event.exception?.values?.[0]?.type || 'Unknown event')
    }
    
    return event
  },
})