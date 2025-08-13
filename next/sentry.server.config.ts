import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust traces sample rate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: false, // Disabled to reduce console noise

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Optional: Add custom integrations for server-side
  integrations: [
    // Add additional integrations here if needed
    // For example, if using Prisma:
    // Sentry.prismaIntegration(),
  ],

  // Before sending event to Sentry
  beforeSend(event, _hint) {
    // In development, log events to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sentry Server] Captured event:', event.message || event.exception?.values?.[0]?.type || 'Unknown event')
    }
    
    return event
  },
})