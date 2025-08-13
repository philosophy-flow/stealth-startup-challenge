# Sentry Implementation Strategy

Technical implementation strategy and architecture for integrating Sentry into the app.

## Architecture Overview

### System Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Browser    │  │  Server      │  │  Edge        │           │
│  │   Client     │  │  Runtime     │  │  Runtime     │           │
│  │              │  │              │  │              │           │
│  │  - UI Errors │  │  - API Routes│  │  - Middleware│           │
│  │  - User      │  │  - SSR Pages │  │  - Edge API  │           │
│  │    Actions   │  │  - Actions   │  │    Routes    │           │
│  │  - Perf      │  │  - Webhooks  │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                           │                                     │
│                    ┌──────▼───────┐                             │
│                    │  Sentry SDK  │                             │
│                    │  Integration  │                            │
│                    └──────┬───────┘                             │
└─────────────────────────────┼─────────────────────────────────--┘
                             │
                    ┌────────▼────────┐
                    │   Sentry Cloud  │
                    │   ───────────── │
                    │  • Error Track  │
                    │  • Performance  │
                    │  • Replay       │
                    │  • Alerts       │
                    └─────────────────┘
```

## File Structure

```
/
├── instrumentation.ts              # Entry point for server-side Sentry
├── sentry.client.config.ts        # Browser SDK configuration
├── sentry.server.config.ts        # Node.js server configuration
├── sentry.edge.config.ts          # Edge runtime configuration
├── next.config.ts                  # Next.js config wrapped with Sentry
├── .env.local                      # Environment variables (not in git)
├── .env.example                    # Example environment template
├── .sentryclirc                    # Sentry CLI config (if needed)
└── src/
    ├── lib/
    │   └── sentry/
    │       ├── index.ts           # Sentry utilities and helpers
    │       ├── monitoring.ts      # Custom monitoring functions
    │       └── error-boundaries.tsx # React error boundary components
    └── app/
        └── test-sentry/           # Test page for verification
            └── page.tsx
```

## Integration Points

### 1. Authentication System

```typescript
// src/lib/supabase/auth.ts
import * as Sentry from "@sentry/nextjs";

export async function loginWithOTP(email: string) {
    Sentry.addBreadcrumb({
        message: "OTP login attempt",
        category: "auth",
        level: "info",
        data: { email },
    });

    try {
        const result = await supabase.auth.signInWithOtp({ email });

        if (result.user) {
            // Set user context for all future errors
            Sentry.setUser({
                id: result.user.id,
                email: result.user.email,
            });
        }

        return result;
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                auth_method: "otp",
                auth_action: "login",
            },
        });
        throw error;
    }
}

export async function logout() {
    const user = Sentry.getCurrentUser();

    Sentry.addBreadcrumb({
        message: "User logout",
        category: "auth",
        data: { userId: user?.id },
    });

    // Clear user context
    Sentry.setUser(null);

    return await supabase.auth.signOut();
}
```

### 2. Database Operations

```typescript
// src/lib/supabase/patients.ts
import * as Sentry from "@sentry/nextjs";

export async function getPatients() {
    return await Sentry.startSpan(
        {
            name: "db.query.patients",
            op: "db",
            attributes: {
                "db.system": "postgresql",
                "db.name": "aviator_health",
                "db.operation": "SELECT",
                "db.table": "patients",
            },
        },
        async (span) => {
            try {
                const { data, error } = await supabase.from("patients").select("*");

                if (error) {
                    span?.recordException(error);
                    span?.setStatus({ code: 2 });
                    throw error;
                }

                span?.setAttribute("db.rows_affected", data.length);
                return data;
            } catch (error) {
                Sentry.captureException(error, {
                    tags: {
                        database: "supabase",
                        operation: "getPatients",
                    },
                });
                throw error;
            }
        }
    );
}
```

### 3. Voice System Integration

```typescript
// src/app/api/calls/trigger/route.ts
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
    const transaction = Sentry.startInactiveSpan({
        name: "api.calls.trigger",
        op: "http.server",
    });

    try {
        const { patientId } = await request.json();

        // Track call initiation
        Sentry.addBreadcrumb({
            message: "Initiating patient call",
            category: "voice_system",
            level: "info",
            data: { patientId, timestamp: new Date().toISOString() },
        });

        // Create Twilio call with monitoring
        const call = await Sentry.startSpan(
            {
                name: "twilio.calls.create",
                op: "http.client",
                attributes: {
                    "http.method": "POST",
                    "http.url": "api.twilio.com",
                    "patient.id": patientId,
                },
            },
            async () => {
                return await twilioClient.calls.create({
                    to: patientPhone,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    url: webhookUrl,
                });
            }
        );

        transaction?.setAttribute("twilio.call_sid", call.sid);
        transaction?.setStatus({ code: 1 });

        return NextResponse.json({ success: true, callSid: call.sid });
    } catch (error) {
        transaction?.recordException(error);
        transaction?.setStatus({ code: 2 });

        Sentry.captureException(error, {
            tags: {
                api_route: "calls_trigger",
                service: "twilio",
            },
            extra: {
                request_body: await request.text(),
            },
        });

        return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    } finally {
        transaction?.end();
    }
}
```

### 4. Webhook Monitoring

```typescript
// src/app/api/webhooks/twilio/voice/[state]/route.ts
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest, { params }: { params: { state: string } }) {
    const transaction = Sentry.startTransaction({
        name: `webhook.twilio.voice.${params.state}`,
        op: "webhook",
    });

    // Set webhook context
    Sentry.configureScope((scope) => {
        scope.setContext("webhook", {
            type: "twilio_voice",
            state: params.state,
            timestamp: new Date().toISOString(),
        });
    });

    try {
        const formData = await request.formData();
        const callSid = formData.get("CallSid") as string;

        transaction.setTag("twilio.call_sid", callSid);

        // Add breadcrumb for webhook processing
        Sentry.addBreadcrumb({
            message: `Processing voice webhook: ${params.state}`,
            category: "webhook",
            level: "info",
            data: {
                callSid,
                state: params.state,
                callStatus: formData.get("CallStatus"),
            },
        });

        // Process webhook with monitoring
        const response = await processWebhook(params.state, formData);

        transaction.setStatus("ok");
        return response;
    } catch (error) {
        transaction.setStatus("internal_error");

        Sentry.captureException(error, {
            tags: {
                webhook_type: "twilio_voice",
                webhook_state: params.state,
            },
        });

        return new Response("Error processing webhook", { status: 500 });
    } finally {
        transaction.finish();
    }
}
```

### 5. OpenAI Integration

```typescript
// src/lib/openai.ts
import * as Sentry from "@sentry/nextjs";

export async function generateTTS(text: string): Promise<string> {
    const span = Sentry.startInactiveSpan({
        name: "openai.tts.generate",
        op: "ai",
        attributes: {
            "ai.model": "tts-1",
            "ai.operation": "text_to_speech",
            "ai.input_length": text.length,
        },
    });

    try {
        const startTime = Date.now();

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: text,
            speed: 0.9,
        });

        const duration = Date.now() - startTime;

        span?.setAttributes({
            "ai.duration_ms": duration,
            "ai.response_size": mp3.size,
        });

        span?.setStatus({ code: 1 });

        // Track performance metric
        Sentry.metrics.distribution("openai.tts.duration", duration, {
            tags: { model: "tts-1" },
        });

        return processAudioResponse(mp3);
    } catch (error) {
        span?.recordException(error);
        span?.setStatus({ code: 2 });

        Sentry.captureException(error, {
            tags: {
                service: "openai",
                operation: "tts_generation",
            },
            extra: {
                text_length: text.length,
                text_preview: text.substring(0, 100),
            },
        });

        throw error;
    } finally {
        span?.end();
    }
}
```

## Environment Configuration Strategy

### Development Environment

```typescript
// sentry.client.config.ts (development)
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: "development",
    debug: true,
    tracesSampleRate: 1.0, // 100% sampling in dev
    replaysSessionSampleRate: 1.0, // Always record in dev
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
        // Log to console in development
        console.log("Sentry Event:", event);
        return event;
    },
});
```

### Staging Environment

```typescript
// sentry.client.config.ts (staging)
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: "staging",
    debug: false,
    tracesSampleRate: 0.5, // 50% sampling
    replaysSessionSampleRate: 0.2, // 20% session recording
    replaysOnErrorSampleRate: 1.0,
    integrations: [
        // Additional staging-specific integrations
    ],
});
```

### Production Environment

```typescript
// sentry.client.config.ts (production)
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: "production",
    debug: false,
    tracesSampleRate: 0.1, // 10% sampling for cost control
    replaysSessionSampleRate: 0.1, // 10% session recording
    replaysOnErrorSampleRate: 1.0, // Always record on error

    // Privacy and PII handling
    beforeSend(event, hint) {
        // Scrub sensitive data
        if (event.request?.cookies) {
            delete event.request.cookies;
        }

        // Remove patient phone numbers from errors
        if (event.extra) {
            event.extra = scrubPhoneNumbers(event.extra);
        }

        return event;
    },

    // Ignore certain errors
    ignoreErrors: ["ResizeObserver loop limit exceeded", "Non-Error promise rejection captured", /Failed to fetch/i],

    // Filter transactions
    tracesSampler(samplingContext) {
        // Don't sample health check endpoints
        if (samplingContext.transactionContext.name === "GET /api/health") {
            return 0;
        }

        // Higher sampling for critical paths
        if (samplingContext.transactionContext.name.includes("calls/trigger")) {
            return 0.5;
        }

        // Default sampling
        return 0.1;
    },
});
```

## Custom Error Boundaries

### Global Error Boundary

```typescript
// src/lib/sentry/error-boundaries.tsx
import * as Sentry from "@sentry/nextjs";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    const errorId = Sentry.captureException(error);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                <p className="text-gray-600 mb-4">We've been notified and are working on a fix.</p>
                <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">{error.message}</pre>
                </details>
                <p className="text-xs text-gray-400 mb-4">Error ID: {errorId}</p>
                <button
                    onClick={resetErrorBoundary}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ReactErrorBoundary
            FallbackComponent={ErrorFallback}
            onError={(error, errorInfo) => {
                // Additional error handling
                console.error("Error caught by boundary:", error, errorInfo);
            }}
            onReset={() => {
                // Clear any error state
                window.location.href = "/";
            }}
        >
            {children}
        </ReactErrorBoundary>
    );
}
```

### Route-Specific Error Boundary

```typescript
// src/app/dashboard/layout.tsx
import { GlobalErrorBoundary } from "@/lib/sentry/error-boundaries";

export default function DashboardLayout({ children }) {
    return (
        <GlobalErrorBoundary>
            <div className="dashboard-layout">{children}</div>
        </GlobalErrorBoundary>
    );
}
```

## Performance Monitoring Strategy

### Key Transactions to Monitor

1. **Authentication Flow**

    - OTP request time
    - Verification time
    - Session creation

2. **Patient Management**

    - List loading time
    - CRUD operation duration
    - Search/filter performance

3. **Voice System**

    - Call initiation latency
    - Webhook processing time
    - Audio generation duration

4. **External APIs**
    - Twilio API response times
    - OpenAI API latency
    - Supabase query performance

### Custom Metrics

```typescript
// src/lib/sentry/monitoring.ts
import * as Sentry from "@sentry/nextjs";

export function trackCallMetrics(callData: CallData) {
    // Track call duration
    Sentry.metrics.distribution("call.duration", callData.duration, {
        tags: {
            status: callData.status,
            mood: callData.mood,
        },
        unit: "second",
    });

    // Track success rate
    Sentry.metrics.increment("call.total", 1, {
        tags: { status: callData.status },
    });

    // Track mood distribution
    if (callData.mood) {
        Sentry.metrics.increment(`call.mood.${callData.mood}`, 1);
    }
}

export function trackAPILatency(service: string, duration: number) {
    Sentry.metrics.distribution("api.latency", duration, {
        tags: { service },
        unit: "millisecond",
    });
}

export function trackDatabaseQuery(operation: string, duration: number) {
    Sentry.metrics.distribution("db.query.duration", duration, {
        tags: { operation },
        unit: "millisecond",
    });
}
```

## Alert Configuration

### Critical Alerts

1. **High Error Rate**

    - Condition: > 10 errors in 5 minutes
    - Action: Email + Slack notification

2. **Failed Call Initiation**

    - Condition: Any error with tag `api_route:calls_trigger`
    - Action: Immediate notification

3. **Authentication Failures**

    - Condition: > 5 failed OTP attempts in 10 minutes
    - Action: Security alert

4. **Performance Degradation**

    - Condition: P95 response time > 3 seconds
    - Action: Performance alert

5. **External API Failures**
    - Condition: Twilio/OpenAI errors > 3 in 5 minutes
    - Action: Service degradation alert

## Privacy and Compliance

### PII Scrubbing

```typescript
// src/lib/sentry/privacy.ts
export function scrubPII(data: any): any {
    // Remove phone numbers
    const phoneRegex = /\+?[1-9]\d{1,14}/g;

    // Remove email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Recursively scrub objects
    if (typeof data === "object" && data !== null) {
        const scrubbed = {};
        for (const [key, value] of Object.entries(data)) {
            if (key.toLowerCase().includes("phone") || key.toLowerCase().includes("email")) {
                scrubbed[key] = "[REDACTED]";
            } else {
                scrubbed[key] = scrubPII(value);
            }
        }
        return scrubbed;
    }

    if (typeof data === "string") {
        return data.replace(phoneRegex, "[PHONE]").replace(emailRegex, "[EMAIL]");
    }

    return data;
}
```

### GDPR Compliance

-   User consent for error tracking
-   Right to deletion requests
-   Data retention policies (30 days default)
-   IP anonymization enabled

## Testing Strategy

### Unit Testing Sentry Integration

```typescript
// __tests__/sentry.test.ts
import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs");

describe("Sentry Integration", () => {
    it("should capture exceptions with correct context", () => {
        const error = new Error("Test error");
        const context = { user: "test-user" };

        captureErrorWithContext(error, context);

        expect(Sentry.captureException).toHaveBeenCalledWith(error, {
            extra: context,
        });
    });

    it("should track performance spans", () => {
        const span = Sentry.startSpan({ name: "test-span" }, () => {
            return "result";
        });

        expect(span).toBe("result");
        expect(Sentry.startSpan).toHaveBeenCalled();
    });
});
```

### E2E Testing

```typescript
// e2e/sentry.spec.ts
test("should send errors to Sentry", async ({ page }) => {
    // Navigate to test page
    await page.goto("/test-sentry");

    // Trigger error
    await page.click('button:has-text("Trigger Error")');

    // Wait for Sentry request
    const sentryRequest = await page.waitForRequest((request) => request.url().includes("sentry.io"));

    expect(sentryRequest).toBeDefined();
});
```

## Deployment Checklist

-   [ ] Environment variables configured in Vercel
-   [ ] Source maps uploading enabled
-   [ ] Release tracking configured
-   [ ] Alerts set up for production
-   [ ] Privacy controls implemented
-   [ ] Performance baselines established
-   [ ] Error budget defined
-   [ ] Runbook for common errors created
-   [ ] Team notification channels configured
-   [ ] Dashboard customized for stakeholders

## Monitoring Dashboard

### Key Metrics to Track

1. **Error Rate**: Errors per minute/hour
2. **Apdex Score**: Application performance index
3. **Transaction Duration**: P50, P75, P95, P99
4. **User Misery Score**: Users experiencing slow transactions
5. **Crash Free Rate**: Sessions without crashes
6. **Release Health**: Error rate per release

### Custom Dashboards

-   **Executive Dashboard**: High-level health metrics
-   **Developer Dashboard**: Detailed error analysis
-   **Operations Dashboard**: Infrastructure and performance
-   **Business Dashboard**: User impact and SLA tracking

## Cost Optimization

### Sampling Strategies

```typescript
// Dynamic sampling based on traffic
export function getDynamicSampleRate(): number {
    const hour = new Date().getHours();

    // Higher sampling during business hours
    if (hour >= 9 && hour <= 17) {
        return 0.2; // 20%
    }

    // Lower sampling during off-hours
    return 0.05; // 5%
}
```

### Data Retention

-   Errors: 90 days
-   Transactions: 30 days
-   Replays: 30 days
-   Custom metrics: 90 days

### Budget Alerts

-   Set up billing alerts at 80% of monthly quota
-   Automatic sampling reduction at 90%
-   Emergency shutdown at 100%

## Future Enhancements

1. **Advanced Error Grouping**: Custom fingerprinting for better grouping
2. **Distributed Tracing**: Connect frontend to backend traces
3. **Custom Dashboards**: Business-specific metrics
4. **AI-Powered Insights**: Anomaly detection and root cause analysis
5. **Integration with CI/CD**: Automated release tracking
6. **Performance Budgets**: Automated performance regression detection
7. **User Feedback Widget**: In-app error reporting
8. **Session Replay Enhancement**: Custom privacy rules
