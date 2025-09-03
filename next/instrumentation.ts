import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { sharedSentryConfig } from "@/lib/sentry/config";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        Sentry.init({
            ...sharedSentryConfig,
        });
    }
}

export const onRequestError: Instrumentation.onRequestError = (...args) => {
    Sentry.captureRequestError(...args);
};
