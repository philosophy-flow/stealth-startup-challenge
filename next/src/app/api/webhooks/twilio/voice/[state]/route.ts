import { NextRequest } from "next/server";
import { getCallWithPatient, updateResponseData } from "@/lib/supabase/calls";
import {
    createQuestionResponse,
    createPlayAndHangupResponse,
    createErrorResponse,
} from "@/lib/twilio/twiml";
import {
    getNextState,
    parseYesNo,
    processNumberGame,
    parseTwilioFormData,
    generateTTSWithFallback,
} from "@/utils/calls";
import { getAppUrl } from "@/utils/url";
import { log, logError } from "@/utils/logging";
import { CallState } from "@/types/business";
import type { VoiceType } from "@/types/business";
import { initializeConnection } from "./initializeConnection";

export async function POST(request: NextRequest, context: { params: Promise<{ state: string }> }) {
    try {
        const params = await context.params;
        const currentState = params.state as string;

        // Parse form data from Twilio
        const formData = await request.formData();
        const twilioParams = await parseTwilioFormData(formData);

        const callSid = twilioParams.CallSid;
        const speechResult = twilioParams.SpeechResult || "";
        const answeredBy = twilioParams.AnsweredBy;

        log("VOICE", `State: ${currentState}, CallSid: ${callSid}`);
        log("VOICE", `Speech result: "${speechResult}"`);

        // Handle initial connection
        if (currentState === "initial") {
            return initializeConnection(request, callSid, answeredBy, twilioParams);
        }

        // Rest of the code handles subsequent states after initial connection

        // Get call record from database
        const callRecord = await getCallWithPatient(callSid);

        if (!callRecord) {
            logError("VOICE", "Call record not found");

            // Return error message
            return createErrorResponse({
                message: "I'm sorry, I can't continue with this call.",
            });
        }

        const patientVoice = (callRecord.patient.voice || "nova") as VoiceType;

        // Get existing response data
        const responseData = callRecord.response_data || {};
        let transcript = responseData.call_transcript || "";

        // Add patient response to transcript
        if (speechResult) {
            transcript += `Patient: ${speechResult}\n`;
        }

        // Map state string to enum
        const stateMap: Record<string, CallState> = {
            mood_check: CallState.MOOD_CHECK,
            schedule_check: CallState.SCHEDULE_CHECK,
            medication_reminder: CallState.MEDICATION_REMINDER,
            number_game: CallState.NUMBER_GAME,
            number_game_response: CallState.NUMBER_GAME_RESPONSE,
            closing: CallState.CLOSING,
        };

        const state = stateMap[currentState] || CallState.ERROR;

        // Process response based on current state
        switch (state) {
            case CallState.MOOD_CHECK:
                // Mood will be determined by AI at call completion
                responseData.overall_mood = "unknown";
                break;

            case CallState.SCHEDULE_CHECK:
                responseData.todays_agenda = speechResult || "No specific plans mentioned";
                break;

            case CallState.MEDICATION_REMINDER:
                responseData.medications_taken = parseYesNo(speechResult);
                break;

            case CallState.NUMBER_GAME:
                // This case never runs due to special handling that jumps directly to NUMBER_GAME_RESPONSE
                // Keeping empty for state machine completeness
                break;

            case CallState.NUMBER_GAME_RESPONSE:
                // Generate fresh secret number (like the old code did before refactor)
                const secretNumber = Math.floor(Math.random() * 10) + 1;
                const gameResult = processNumberGame(speechResult, secretNumber);
                responseData.patient_guess = gameResult.guess;
                responseData.game_result = gameResult.result;
                responseData.secret_number = secretNumber; // Store for feedback message

                // Generate feedback message for the game
                let gameFeedback = "";
                if (gameResult.result === "winner") {
                    gameFeedback = `Nicely done! You correctly guessed the number was ${secretNumber}.`;
                } else {
                    gameFeedback = `Good try! The number was ${secretNumber}.`;
                }
                responseData.gameFeedback = gameFeedback;
                transcript += `System: ${gameFeedback}\n`;
                break;

            case CallState.CLOSING:
                // Patient said something during closing, just acknowledge
                if (speechResult) {
                    log("VOICE", `Patient response during closing: ${speechResult}`);
                }
                break;
        }

        // Update call with latest response data and transcript
        await updateResponseData(callSid, {
            ...responseData,
            call_transcript: transcript,
        });

        // Get next state
        const nextState = getNextState(state);

        // If we're ending the call
        if (nextState === CallState.END || state === CallState.CLOSING) {
            log("VOICE", "Call ending");

            // Generate closing message based on context
            const closingText = `Thank you, ${callRecord.patient.first_name}. Have a wonderful day!`;

            const { audioUrl, fallbackText } = await generateTTSWithFallback(closingText, patientVoice);

            // Generate closing response with TTS or fallback
            return createPlayAndHangupResponse({
                audioUrl,
                fallbackText,
            });
        }

        // Generate prompt for next state
        // Special case: if we just processed NUMBER_GAME_RESPONSE, use the feedback we already generated
        let nextPrompt: string;
        if (state === CallState.NUMBER_GAME_RESPONSE && responseData.gameFeedback) {
            // Use the game feedback (winner/loser announcement) as the next prompt
            nextPrompt = responseData.gameFeedback;
        } else {
            // Generate normal prompt for next state
            const prompts = {
                [CallState.GREETING]: "Hi, this is your daily check-in call.", // Shouldn't be used, but included for completeness
                [CallState.MOOD_CHECK]: "How are you feeling today?", // Shouldn't be used, but included for completeness
                [CallState.SCHEDULE_CHECK]: "What are your plans for today?",
                [CallState.MEDICATION_REMINDER]: "Have you taken your medications?",
                [CallState.NUMBER_GAME]:
                    "Let's play a guessing game. I'm thinking of a number between 1 and 10. What's your guess?",
                [CallState.NUMBER_GAME_RESPONSE]: "Let's continue.",
                [CallState.CLOSING]: "Thank you. Have a wonderful day!",
                [CallState.ERROR]: "Sorry, I didn't catch that. Let's continue.",
                [CallState.END]: "Goodbye!",
            };
            nextPrompt = prompts[nextState] || "Let's continue.";
            transcript += `System: ${nextPrompt}\n`;
        }

        log("VOICE", `Moving to state: ${nextState}, prompt: ${nextPrompt}`);

        // Generate TTS for next prompt
        const { audioUrl, fallbackText } = await generateTTSWithFallback(nextPrompt, patientVoice);
        const baseUrl = getAppUrl();

        // Map next state to URL
        let nextStateUrl = "";
        switch (nextState) {
            case CallState.MOOD_CHECK:
                nextStateUrl = "mood_check";
                break;
            case CallState.SCHEDULE_CHECK:
                nextStateUrl = "schedule_check";
                break;
            case CallState.MEDICATION_REMINDER:
                nextStateUrl = "medication_reminder";
                break;
            case CallState.NUMBER_GAME:
                nextStateUrl = "number_game";
                break;
            case CallState.NUMBER_GAME_RESPONSE:
                nextStateUrl = "number_game_response";
                break;
            case CallState.CLOSING:
                nextStateUrl = "closing";
                break;
            default:
                nextStateUrl = "closing";
        }

        const nextAction = `${baseUrl}/api/webhooks/twilio/voice/${nextStateUrl}`;

        // Special handling for number game - ask for their guess
        if (nextState === CallState.NUMBER_GAME) {
            return createQuestionResponse({
                audioUrl,
                fallbackText,
                actionUrl: `${baseUrl}/api/webhooks/twilio/voice/number_game_response`,
                speechTimeout: 4,
                speechModel: "numbers_and_commands",
                noInputAction: `${baseUrl}/api/webhooks/twilio/voice/closing`,
                noInputMessage: "Let's continue.",
            });
        }

        // Normal question flow
        return createQuestionResponse({
            audioUrl,
            fallbackText,
            actionUrl: nextAction,
            noInputAction: nextAction,
            noInputMessage: "Let's continue.",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        logError("VOICE", "Error processing webhook", error);

        // Return error response
        return createErrorResponse();
    }
}
