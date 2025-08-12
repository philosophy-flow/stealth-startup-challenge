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
