import twilio from "twilio";

// Initialize Twilio client
export const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

// Validate Twilio webhook signature for security
export function validateTwilioWebhook(
    authToken: string,
    signature: string | null,
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any>
): boolean {
    if (!signature) return false;

    return twilio.validateRequest(authToken, signature, url, params);
}

// Helper to format phone numbers for Twilio
export function formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // Add country code if not present
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `+${cleaned}`;
    }

    // Assume it's already properly formatted
    return phone.startsWith("+") ? phone : `+${phone}`;
}
