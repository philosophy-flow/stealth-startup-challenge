import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap the config with Sentry
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project for source map upload
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source map upload
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sentry SDK options
  widenClientFileUpload: true,
  
  // Route to tunnel Sentry requests through (helps with ad blockers)
  tunnelRoute: "/monitoring",
  
  // Disable Sentry SDK debug logger to reduce console noise
  disableLogger: true,
  
  // Automatically instrument Vercel Cron Monitors (when deployed on Vercel)
  automaticVercelMonitors: true,
});
