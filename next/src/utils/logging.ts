import * as Sentry from '@sentry/nextjs';

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
    
    // Add breadcrumb for cost tracking
    Sentry.addBreadcrumb({
        message: `Cost: ${service}`,
        category: 'cost',
        level: 'info',
        data: { service, cost, ...details },
    });
    
    // Add cost as a tag for tracking (metrics API is retired in Sentry v10)
    Sentry.setTag(`cost.${service}`, cost.toFixed(4));
}

// General logging utilities
export function log(prefix: string, message: string): void {
    const logMessage = `[${prefix}] ${message}`;
    console.log(logMessage);
    
    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
        message,
        category: prefix.toLowerCase(),
        level: 'info',
        timestamp: Date.now() / 1000,
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logError(prefix: string, message: string, error?: any): void {
    const errorMessage = `[${prefix}] ${message}`;
    console.error(errorMessage, error);
    
    // Capture exception in Sentry
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
        Sentry.captureMessage(errorMessage, 'error');
    }
    
    // Add breadcrumb for error tracking
    Sentry.addBreadcrumb({
        message,
        category: prefix.toLowerCase(),
        level: 'error',
        data: { error: error?.message || error },
        timestamp: Date.now() / 1000,
    });
}
