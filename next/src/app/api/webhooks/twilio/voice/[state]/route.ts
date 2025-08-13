import { NextRequest } from "next/server";
import { getCallWithPatient, updateResponseData } from "@/lib/supabase/calls";
import {
    createQuestionResponse,
    createPlayAndHangupResponse,
    createErrorResponse,
} from "@/lib/twilio/twiml";
import {
    getNextState,
    parseTwilioFormData,
    generateTTSWithFallback,
} from "@/utils/calls";
import { getAppUrl } from "@/utils/url";
import { log, logError } from "@/utils/logging";
import { CallState } from "@/types/business";
import type { VoiceType } from "@/types/business";
import { initializeConnection } from "./initializeConnection";
import { STATE_CONFIG, mapStateStringToEnum } from "./stateHandlers";

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
        const state = mapStateStringToEnum(currentState);
        const handler = STATE_CONFIG[state];

        // Process response using state handler
        if (handler.processResponse) {
            handler.processResponse(speechResult, responseData);
        }

        // Special handling for closing state logging
        if (state === CallState.CLOSING && speechResult) {
            log("VOICE", `Patient response during closing: ${speechResult}`);
        }

        // Special handling for game feedback transcript
        if (state === CallState.NUMBER_GAME && responseData.gameFeedback) {
            transcript += `System: ${responseData.gameFeedback}\n`;
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
        // If we just played the number game and have feedback, use that as the next prompt
        let nextPrompt: string;
        if (state === CallState.NUMBER_GAME && responseData.gameFeedback) {
            nextPrompt = responseData.gameFeedback as string;
        } else {
            const nextHandler = STATE_CONFIG[nextState];
            nextPrompt = nextHandler.getPrompt(responseData);
            transcript += `System: ${nextPrompt}\n`;
        }

        log("VOICE", `Moving to state: ${nextState}, prompt: ${nextPrompt}`);

        // Generate TTS for next prompt
        const { audioUrl, fallbackText } = await generateTTSWithFallback(nextPrompt, patientVoice);
        const baseUrl = getAppUrl();

        // Get URL path and configuration from handler
        const nextHandler = STATE_CONFIG[nextState];
        const nextStateUrl = nextHandler.urlPath;
        const nextAction = `${baseUrl}/api/webhooks/twilio/voice/${nextStateUrl}`;

        // Create question response with appropriate configuration
        return createQuestionResponse({
            audioUrl,
            fallbackText,
            actionUrl: nextAction,
            speechTimeout: nextHandler.speechTimeout,
            speechModel: nextHandler.speechModel,
            noInputAction: nextHandler.noInputActionPath 
                ? `${baseUrl}/api/webhooks/twilio/voice/${nextHandler.noInputActionPath}` 
                : nextAction,
            noInputMessage: "Let's continue.",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        logError("VOICE", "Error processing webhook", error);

        // Return error response
        return createErrorResponse();
    }
}
