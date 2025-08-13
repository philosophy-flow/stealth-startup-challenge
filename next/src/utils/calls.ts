import { CallState } from "@/types/business";
import type { CallUpdateData, Call, Patient, VoiceType } from "@/types/business";
import type { TwilioStatusParams } from "@/types/business";
import { generateCallSummary, generateTTS } from "@/lib/openai";
import { log, logError, calculateTTSCost, logCost } from "@/utils/logging";
import { makeAbsoluteUrl } from "@/utils/url";

// Yes/No response patterns
const YES_PATTERNS = new Set(["yes", "yeah", "yep", "sure", "i have", "i did"]);
const NO_PATTERNS = new Set(["no", "nope", "not", "haven't", "didn't"]);

// Number words for game
const WRITTEN_NUMBERS: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
};

// State transition logic
export function getNextState(currentState: CallState): CallState {
    switch (currentState) {
        case CallState.GREETING:
            return CallState.MOOD_CHECK;
        case CallState.MOOD_CHECK:
            return CallState.SCHEDULE_CHECK;
        case CallState.SCHEDULE_CHECK:
            return CallState.MEDICATION_REMINDER;
        case CallState.MEDICATION_REMINDER:
            return CallState.NUMBER_GAME;
        case CallState.NUMBER_GAME:
            return CallState.CLOSING;
        case CallState.CLOSING:
            return CallState.END;
        case CallState.ERROR:
            return CallState.CLOSING;
        default:
            return CallState.END;
    }
}

// Parse yes/no responses
export function parseYesNo(speechResult: string): boolean | null {
    const lower = speechResult.toLowerCase();

    for (const pattern of YES_PATTERNS) {
        if (lower.includes(pattern)) return true;
    }

    for (const pattern of NO_PATTERNS) {
        if (lower.includes(pattern)) return false;
    }

    return null;
}

// Process number game response
export function processNumberGame(
    speechResult: string,
    secretNumber: number
): {
    guess: number | null;
    result: "winner" | "loser" | "invalid";
} {
    // Extract number from speech
    const numbers = speechResult.match(/\d+/);

    if (!numbers || numbers.length === 0) {
        // Try to parse written numbers
        const lower = speechResult.toLowerCase();
        for (const [word, num] of Object.entries(WRITTEN_NUMBERS)) {
            if (lower.includes(word)) {
                return {
                    guess: num,
                    result: num === secretNumber ? "winner" : "loser",
                };
            }
        }
        return { guess: null, result: "invalid" };
    }

    const guess = parseInt(numbers[0]);

    if (guess < 1 || guess > 10) {
        return { guess, result: "invalid" };
    }

    return {
        guess,
        result: guess === secretNumber ? "winner" : "loser",
    };
}

// Map Twilio status to our internal call status
export function mapTwilioStatusToCallStatus(twilioStatus: string): "completed" | "failed" | "in_progress" {
    switch (twilioStatus) {
        case "completed":
            return "completed";
        case "failed":
        case "busy":
        case "no-answer":
            return "failed";
        default:
            return "in_progress";
    }
}

// Build call update data object
export function buildCallUpdateData(
    status: "completed" | "failed" | "in_progress",
    duration?: string,
    responseData?: Record<string, unknown>
): CallUpdateData {
    const updateData: CallUpdateData = { status };

    if (duration) {
        updateData.call_duration = parseInt(duration);
    }

    if (responseData) {
        updateData.response_data = responseData;
    }

    return updateData;
}

// Parse FormData from Twilio webhook into typed parameters
export async function parseTwilioFormData(formData: FormData): Promise<TwilioStatusParams> {
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
        params[key] = value.toString();
    });
    return params as TwilioStatusParams;
}

// Process call completion and generate summary/mood
export async function processCallCompletion(
    callRecord: Call & { patient: Patient },
    callStatus: string,
    callDuration?: string
): Promise<CallUpdateData> {
    const mappedStatus = mapTwilioStatusToCallStatus(callStatus);

    // If not completed, just return basic update data
    if (callStatus !== "completed") {
        return buildCallUpdateData(mappedStatus, callDuration);
    }

    // Handle completion logic
    const responseData = callRecord.response_data || {};
    const transcript = responseData.call_transcript || "";
    const patientName = `${callRecord.patient.first_name} ${callRecord.patient.last_name}`;

    // Generate summary and mood if we have a transcript
    if (transcript) {
        try {
            const { summary, mood } = await generateCallSummary(transcript, patientName);
            responseData.call_summary = summary;
            responseData.overall_mood = mood;
            log("STATUS", `Generated summary: ${summary}, Mood: ${mood}`);
        } catch (error) {
            logError("STATUS", "Failed to generate summary", error);
            responseData.call_summary = "Call completed successfully.";
            responseData.overall_mood = "unknown";
        }

        // Log cost estimate
        const cost = calculateTTSCost(transcript);
        logCost("TTS", cost, {
            callSid: callRecord.call_sid,
            characterCount: transcript.length,
        });
        log("STATUS", `Call completed. Estimated TTS cost: $${cost.toFixed(4)} for ${transcript.length} characters`);
    }

    return buildCallUpdateData(mappedStatus, callDuration, responseData);
}

// Generate TTS with fallback to text-to-speech if generation fails
export async function generateTTSWithFallback(
    text: string,
    voice: VoiceType
): Promise<{ audioUrl?: string; fallbackText?: string }> {
    try {
        const audioUrl = await generateTTS(text, voice);
        return { audioUrl: makeAbsoluteUrl(audioUrl) };
    } catch (error) {
        logError("VOICE", "TTS generation failed", error);
        return { fallbackText: text };
    }
}
