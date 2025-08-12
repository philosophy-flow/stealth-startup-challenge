import twilio from "twilio";

export const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export function validateTwilioWebhook(
    authToken: string,
    signature: string | null,
    url: string,
    params: Record<string, string>
): boolean {
    if (!signature) return false;

    return twilio.validateRequest(authToken, signature, url, params);
}

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
