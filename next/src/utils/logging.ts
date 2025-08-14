import * as Sentry from "@sentry/nextjs";

// Cost tracking for monitoring
const COSTS = {
    TTS_PER_1K_CHARS: 0.015, // tts-1 model cost
    GPT_MINI_INPUT_PER_1M: 0.15, // gpt-4o-mini input cost
    GPT_MINI_OUTPUT_PER_1M: 0.6, // gpt-4o-mini output cost
};

// Track API usage for cost monitoring
export function calculateTTSCost(text: string): number {
    const charCount = text.length;
    return (charCount / 1000) * COSTS.TTS_PER_1K_CHARS;
}

// Log cost for monitoring (in production, send to analytics)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logCost(service: string, cost: number, details?: any): void {
    const message = `[COST] ${service}: $${cost.toFixed(4)}`;
    console.log(message, details);
}

// General logging utilities
export function log(prefix: string, message: string): void {
    const logMessage = `[${prefix}] ${message}`;
    console.log(logMessage);

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
        message,
        category: prefix.toLowerCase(),
        level: "info",
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logError(prefix: string, message: string, error?: any): void {
    const errorMessage = `[${prefix}] ${message}`;
    console.error(errorMessage, error);

    // Add breadcrumb before capturing exception
    Sentry.addBreadcrumb({
        message: errorMessage,
        category: prefix.toLowerCase(),
        level: "error",
        data: error ? { error: String(error) } : undefined,
    });

    // capture handled exception in Sentry
    if (error) {
        Sentry.captureException(error, {
            tags: {
                component: prefix.toLowerCase(),
            },
            extra: {
                message,
                prefix,
            },
        });
    } else {
        // If no error object, capture as message
        Sentry.captureMessage(errorMessage, "error");
    }
}
