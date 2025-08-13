# Sentry Setup Guide

A step-by-step guide for developers who have never implemented Sentry before. This guide will walk you through setting up comprehensive error tracking and performance monitoring for the Aviator Health Challenge application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating Your Sentry Account](#creating-your-sentry-account)
3. [Local Development Setup](#local-development-setup)
4. [Testing Your Integration](#testing-your-integration)
5. [Understanding the Sentry Dashboard](#understanding-the-sentry-dashboard)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Prerequisites

Before starting, make sure you have:

-   Node.js 18+ installed
-   The Aviator Health Challenge project cloned locally
-   Access to your project's `.env.local` file
-   About 15 minutes to complete the setup

## Creating Your Sentry Account

### Step 1: Sign Up for Sentry

1. Navigate to [https://sentry.io](https://sentry.io)
2. Click **"Start for free"** button
3. Sign up using either:
    - GitHub account (recommended for developers)
    - Google account
    - Email and password

### Step 2: Create Your Organization

After signing up, you'll be prompted to create an organization:

1. **Organization Name**: Enter something like `aviator-health` or your company name

    - This is your top-level container for all projects
    - Example: `aviator-health-org`

2. **Data Region**: Select the region closest to your users

    - US (United States) - for US-based users
    - EU (Europe) - for GDPR compliance

3. Click **"Create Organization"**

### Step 3: Create Your First Project

1. **Platform Selection**:

    - Search for and select **"Next.js"**
    - This ensures you get Next.js-specific setup instructions

2. **Project Name**:

    - Enter `aviator-health-challenge` or similar
    - This will be used in your configuration

3. **Team Assignment**:

    - Select or create a team (default is fine for now)

4. Click **"Create Project"**

### Step 4: Get Your DSN

After creating the project, you'll see a configuration screen:

1. Look for the **DSN (Data Source Name)** - it looks like:

    ```
    https://abc123def456@o123456.ingest.sentry.io/7890123
    ```

2. **Copy this DSN** - you'll need it for configuration

3. Keep this page open or save the DSN somewhere secure

## Local Development Setup

### Step 1: Install the Sentry SDK

Open your terminal in the project root and run:

```bash
npm install @sentry/nextjs
```

This installs the official Sentry SDK for Next.js applications.

### Step 2: Run the Setup Wizard (Optional but Recommended)

Sentry provides an automated setup wizard:

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard will:

1. Ask for your DSN (paste the one you copied)
2. Create necessary configuration files
3. Update your Next.js configuration
4. Set up source maps

**If you prefer manual setup**, skip the wizard and follow the manual steps below.

### Step 3: Configure Environment Variables

Add these variables to your `.env.local` file:

```env
# Sentry Configuration
SENTRY_DSN=https://YOUR_DSN_HERE@o123456.ingest.sentry.io/7890123
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN_HERE@o123456.ingest.sentry.io/7890123
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=aviator-health-challenge
SENTRY_AUTH_TOKEN=sntrys_YOUR_AUTH_TOKEN_HERE
SENTRY_ENVIRONMENT=development
```

#### Getting Your Auth Token:

1. Go to [https://sentry.io/settings/account/api/auth-tokens/](https://sentry.io/settings/account/api/auth-tokens/)
2. Click **"Create New Token"**
3. Give it a name like "Aviator Health Local Dev"
4. Select scopes:
    - `project:releases` (create and list releases)
    - `org:read` (read org details)
5. Click **"Create Token"**
6. Copy the token (starts with `sntrys_`)
7. Add it to your `.env.local` file

### Step 4: Create Configuration Files

If you didn't use the wizard, create these files manually:

#### 1. Create `instrumentation.ts` in your project root:

```typescript
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config");
    }
}
```

#### 2. Create `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust sample rate for production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Capture replay in 10% of sessions,
    // and 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment tag
    environment: process.env.NODE_ENV,

    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === "development",
});
```

#### 3. Create `sentry.server.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Adjust sample rate for production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Environment tag
    environment: process.env.NODE_ENV,
});
```

#### 4. Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
});
```

### Step 5: Update Next.js Configuration

Modify your `next.config.ts` to wrap it with Sentry:

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
    // Your existing Next.js configuration
};

export default withSentryConfig(nextConfig, {
    // Suppresses source map uploading logs during build
    silent: true,

    // Upload options
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Additional options
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
});
```

## Testing Your Integration

### Step 1: Create a Test Error

Add a test button to trigger an error. Create a new file `src/app/test-sentry/page.tsx`:

```typescript
"use client";

export default function TestSentry() {
    return (
        <div className="p-8">
            <h1 className="text-2xl mb-4">Sentry Test Page</h1>

            <button
                onClick={() => {
                    throw new Error("Test error from Aviator Health!");
                }}
                className="bg-red-500 text-white px-4 py-2 rounded"
            >
                Trigger Test Error
            </button>

            <button
                onClick={() => {
                    console.log("This is a test log");
                    Sentry.captureMessage("Test message from Aviator Health", "info");
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded ml-4"
            >
                Send Test Message
            </button>
        </div>
    );
}
```

### Step 2: Start Your Development Server

```bash
npm run dev
```

### Step 3: Test the Integration

1. Navigate to `http://localhost:3000/test-sentry`
2. Click the **"Trigger Test Error"** button
3. You should see an error in your browser console
4. Go to your Sentry dashboard at [https://sentry.io](https://sentry.io)
5. Navigate to **Issues** in the left sidebar
6. You should see your test error appear within a few seconds!

### Step 4: Verify Source Maps

Check that your error in Sentry shows:

-   ✅ Readable stack trace with actual file names
-   ✅ Line numbers that match your source code
-   ✅ Code context (shows surrounding lines)

If source maps aren't working, check that:

-   Your `SENTRY_AUTH_TOKEN` is set correctly
-   The build process completed without errors

## Understanding the Sentry Dashboard

### Issues Tab

This is where you'll spend most of your time:

-   **Error List**: Shows all unique errors
-   **Occurrences**: How many times each error happened
-   **Users Affected**: Number of unique users who experienced the error
-   **Last Seen**: When the error last occurred

### Error Details Page

Click on any error to see:

-   **Stack Trace**: Full error stack with source code
-   **Breadcrumbs**: User actions leading to the error
-   **User Context**: Information about the affected user
-   **Tags**: Custom tags you've added
-   **Similar Issues**: Related errors

### Performance Tab

Monitor your application's performance:

-   **Transaction Summary**: Overview of all transactions
-   **Web Vitals**: Core Web Vitals metrics
-   **Database Queries**: Slow queries (if instrumented)
-   **API Calls**: External API performance

### Releases Tab

Track deployments:

-   **Release Health**: Error rate per release
-   **Adoption**: How many users on each version
-   **Regressions**: New errors in latest release

### Alerts Tab

Set up notifications:

1. Click **"Create Alert"**
2. Choose alert type:
    - Issue Alert: When errors occur
    - Metric Alert: Performance thresholds
3. Set conditions (e.g., "more than 10 errors in 5 minutes")
4. Choose notification method (email, Slack, etc.)

## Troubleshooting Common Issues

### Issue 1: Errors Not Appearing in Dashboard

**Symptoms**: Triggered errors but nothing shows in Sentry

**Solutions**:

1. Check browser console for Sentry initialization errors
2. Verify DSN is correct in `.env.local`
3. Ensure environment variables are loaded (restart dev server)
4. Check browser network tab for requests to `sentry.io`

### Issue 2: Source Maps Not Working

**Symptoms**: Stack traces show minified code

**Solutions**:

1. Verify `SENTRY_AUTH_TOKEN` has correct permissions
2. Check build output for source map upload errors
3. Ensure `hideSourceMaps: true` in Next.js config
4. Try rebuilding: `npm run build`

### Issue 3: Performance Transactions Not Showing

**Symptoms**: No data in Performance tab

**Solutions**:

1. Check `tracesSampleRate` is greater than 0
2. Verify transactions are being created (check Network tab)
3. Wait a few minutes - transactions can be delayed
4. Ensure you're actually triggering transactions (navigate between pages)

### Issue 4: Session Replay Not Working

**Symptoms**: No session replays available

**Solutions**:

1. Verify replay integration is added in `sentry.client.config.ts`
2. Check `replaysSessionSampleRate` is greater than 0
3. Trigger an error (100% capture on error)
4. Check browser console for replay-related errors

### Issue 5: Environment Variables Not Loading

**Symptoms**: Sentry not initializing, undefined DSN errors

**Solutions**:

1. Ensure `.env.local` file exists
2. Restart development server after adding variables
3. Don't commit `.env.local` to git
4. Use `NEXT_PUBLIC_` prefix for client-side variables

## Next Steps

Now that Sentry is set up, you can:

1. **Add User Context**: After login, call `Sentry.setUser()` with user info
2. **Create Custom Alerts**: Set up Slack/email notifications
3. **Add Breadcrumbs**: Track user actions before errors
4. **Monitor Performance**: Add custom performance tracking
5. **Set Up Releases**: Track errors by deployment

## Additional Resources

-   [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
-   [Sentry Best Practices](https://docs.sentry.io/product/sentry-basics/guides/best-practices/)
-   [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
-   [Session Replay Documentation](https://docs.sentry.io/product/session-replay/)
-   [Sentry Discord Community](https://discord.gg/sentry)

## Getting Help

If you encounter issues:

1. Check the [Sentry Status Page](https://status.sentry.io/)
2. Search the [Sentry GitHub Issues](https://github.com/getsentry/sentry-javascript/issues)
3. Ask in the [Sentry Discord](https://discord.gg/sentry)
4. Contact Sentry Support (paid plans)

Remember: Sentry is meant to help you ship better code with confidence. Start simple and add more sophisticated tracking as you get comfortable!
