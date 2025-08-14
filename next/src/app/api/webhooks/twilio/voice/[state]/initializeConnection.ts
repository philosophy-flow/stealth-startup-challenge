import { NextRequest, NextResponse } from "next/server";
import { validateTwilioWebhook } from "@/lib/twilio";
import { getCallWithPatient, updateCallStatus, updateResponseData } from "@/lib/supabase/calls";
import { createErrorResponse, createSimpleHangupResponse, createQuestionResponse } from "@/lib/twilio/twiml";
import { generateTTS } from "@/lib/openai";
import { getAppUrl, makeAbsoluteUrl } from "@/utils/url";
import { log, logError } from "@/utils/logging";
import type { VoiceType, TwilioStatusParams } from "@/types/business";

export async function initializeConnection(
    request: NextRequest,
    callSid: string,
    answeredBy: string | undefined,
    twilioParams: TwilioStatusParams
): Promise<NextResponse> {
    log("VOICE", `Initial connection, AnsweredBy: ${answeredBy}`);

    // Validate Twilio webhook signature for initial connection
    const signature = request.headers.get("X-Twilio-Signature");
    const url = request.url;

    // Skip validation in development if signature is missing
    if (process.env.NODE_ENV === "production" && signature) {
        const isValid = validateTwilioWebhook(
            process.env.TWILIO_AUTH_TOKEN!,
            signature,
            url,
            twilioParams as Record<string, string>
        );

        if (!isValid) {
            logError("VOICE", "Invalid Twilio signature");
            return new NextResponse("Unauthorized", { status: 401 });
        }
    }

    // Handle machine detection
    if (answeredBy === "machine_start" || answeredBy === "fax") {
        log("VOICE", "Call answered by machine/fax, hanging up");

        // Update call status
        await updateCallStatus(callSid, {
            status: "failed",
            response_data: {
                error: "Answered by machine or fax",
            },
        });

        // Hang up
        return createSimpleHangupResponse();
    }

    // Get call record from database
    const callRecord = await getCallWithPatient(callSid);

    if (!callRecord) {
        logError("VOICE", "Call record not found");

        // Create a simple greeting anyway
        return createErrorResponse({
            message: "Hello, this is your daily check-in call.",
        });
    }

    // Update call status to in_progress
    await updateCallStatus(callSid, {
        status: "in_progress",
        call_start_time: new Date().toISOString(),
    });

    const patientVoice = (callRecord.patient.voice || "nova") as VoiceType;

    // Generate combined greeting and mood question
    const greetingText = `Hi ${callRecord.patient.first_name}, this is your daily check-in call.`;
    const moodQuestion = "How are you feeling today?";
    const combinedText = `${greetingText} ${moodQuestion}`;

    log("VOICE", `Generating TTS for greeting: ${combinedText}`);
    log("VOICE", `Using voice: ${patientVoice}`);

    // Generate TTS audio
    try {
        const combinedAudioUrl = await generateTTS(combinedText, patientVoice);

        // Make URL absolute
        const baseUrl = getAppUrl();
        const fullAudioUrl = makeAbsoluteUrl(combinedAudioUrl);

        log("VOICE", "TTS generated successfully");

        // Add greeting and mood question to transcript
        await updateResponseData(callSid, {
            patient_name: `${callRecord.patient.first_name} ${callRecord.patient.last_name}`,
            call_transcript: `System: ${greetingText}\nSystem: ${moodQuestion}\n`,
        });

        // Generate TwiML with combined greeting and question
        return createQuestionResponse({
            audioUrl: fullAudioUrl,
            actionUrl: `${baseUrl}/api/webhooks/twilio/voice/mood_check`,
            noInputAction: `${baseUrl}/api/webhooks/twilio/voice/mood_check`,
            noInputMessage: "I didn't hear a response. Let's continue.",
        });
    } catch (ttsError) {
        logError("VOICE", "TTS generation failed", ttsError);

        // Fallback to Twilio's built-in TTS
        const baseUrl = getAppUrl();
        return createQuestionResponse({
            fallbackText: combinedText,
            actionUrl: `${baseUrl}/api/webhooks/twilio/voice/mood_check`,
            noInputAction: `${baseUrl}/api/webhooks/twilio/voice/mood_check`,
            noInputMessage: "I didn't hear a response. Let's continue.",
        });
    }
}
