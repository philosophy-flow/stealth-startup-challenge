/**
 * Get the application URL based on the deployment environment
 * Automatically detects Vercel deployments and handles custom domains
 */
export function getAppUrl(): string {
    // Check for Vercel deployment URL (preview deployments)
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // Check for custom domain or production URL
    if (process.env.NEXT_PUBLIC_APP_URL) {
        const url = process.env.NEXT_PUBLIC_APP_URL;
        // Ensure URL has protocol
        return url.startsWith("http") ? url : `https://${url}`;
    }

    // Fallback to localhost for local development
    return "http://localhost:3000";
}