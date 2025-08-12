import twilio from "twilio";
import RestException from "twilio/lib/base/RestException";
import { formatPhoneNumber } from "@/utils/format";
import { getAppUrl } from "@/utils/url";

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

export async function initiatePatientCall(phoneNumber: string) {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const webhookBaseUrl = getAppUrl();
    
    try {
        const call = await twilioClient.calls.create({
            to: formattedPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            url: `${webhookBaseUrl}/api/webhooks/twilio/voice/initial`,
            statusCallback: `${webhookBaseUrl}/api/webhooks/twilio/status`,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
            machineDetection: "Enable",
            machineDetectionTimeout: 3000,
        });
        
        return call;
    } catch (error) {
        // Check if it's a Twilio RestException
        if (error instanceof RestException) {
            if (error.code === 20003) {
                throw new Error("Invalid Twilio credentials. Please check your environment variables.");
            }
            
            if (error.code === 21211) {
                throw new Error("Invalid phone number format");
            }
            
            throw error;
        }
        
        // Re-throw if it's some other error type
        if (error instanceof Error) {
            throw error;
        }
        
        // Fallback for non-Error types
        throw new Error("An unexpected error occurred");
    }
}
