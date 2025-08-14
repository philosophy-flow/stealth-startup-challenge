import * as Sentry from "@sentry/nextjs";
import { sharedSentryConfig } from "@/lib/sentry/config";

const clientIgnoreErrors = [
    /chrome-extension/,
    /moz-extension/,
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
];

const replaySettings =
    process.env.NODE_ENV === "production"
        ? {
              // only capture errors (i.e. no replays for normal sessions (privacy/cost)
              replaysOnErrorSampleRate: 1.0,
              replaysSessionSampleRate: 0,
          }
        : {
              // capture all errors and 10% of session replays
              replaysOnErrorSampleRate: 1.0,
              replaysSessionSampleRate: 0.1,
          };

Sentry.init({
    ...sharedSentryConfig,
    replaysOnErrorSampleRate: replaySettings.replaysOnErrorSampleRate,
    replaysSessionSampleRate: replaySettings.replaysSessionSampleRate,
    ignoreErrors: clientIgnoreErrors, // filter out browser extension noise

    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
        }),
    ],
});

// export router transition hook for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
