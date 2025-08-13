import { NextResponse } from "next/server";
import twilio from "twilio";
import type { TwilioVoice, QuestionOptions, PlayHangupOptions, ErrorOptions } from "@/types/business";

// Default configuration for TwiML responses
const TWIML_DEFAULTS = {
    voice: "alice" as TwilioVoice,
    language: "en-US" as const,
    speechTimeout: 3,
    speechModel: "phone_call" as const,
    noInputMessage: "Let's continue.",
    errorMessage: "I'm sorry, there was an error. Goodbye.",
    method: "POST" as const,
};

// Helper: Format TwiML as HTTP response
const formatTwiMLResponse = (response: twilio.twiml.VoiceResponse): NextResponse =>
    new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
    });

// Helper: Add voice message to the call (audio file or text-to-speech)
const addVoiceMessage = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any, // VoiceResponse or Gather
    audioUrl?: string,
    text?: string,
    voice: TwilioVoice = TWIML_DEFAULTS.voice
): void => {
    if (audioUrl) {
        target.play(audioUrl);
    } else if (text) {
        target.say({ voice, language: TWIML_DEFAULTS.language }, text);
    }
};

/**
 * Ask the caller a question and wait for their response
 */
export function createQuestionResponse(options: QuestionOptions): NextResponse {
    const {
        audioUrl,
        fallbackText,
        actionUrl,
        speechTimeout = TWIML_DEFAULTS.speechTimeout,
        speechModel = TWIML_DEFAULTS.speechModel,
        noInputAction,
        noInputMessage = TWIML_DEFAULTS.noInputMessage,
    } = options;

    const response = new twilio.twiml.VoiceResponse();

    // Create the gather element
    const gather = response.gather({
        input: ["speech"],
        speechTimeout: speechTimeout.toString(),
        speechModel,
        action: actionUrl,
        method: TWIML_DEFAULTS.method,
    });

    // Add the question audio or text
    addVoiceMessage(gather, audioUrl, fallbackText);

    // Add no-input fallback
    if (noInputMessage) {
        response.say({ voice: TWIML_DEFAULTS.voice, language: TWIML_DEFAULTS.language }, noInputMessage);
    }

    if (noInputAction) {
        response.redirect(noInputAction);
    }

    return formatTwiMLResponse(response);
}

/**
 * Creates a TwiML response that plays audio (or says text) and then hangs up
 */
export function createPlayAndHangupResponse(options: PlayHangupOptions = {}): NextResponse {
    const response = new twilio.twiml.VoiceResponse();
    addVoiceMessage(response, options.audioUrl, options.fallbackText, options.voice);
    response.hangup();
    return formatTwiMLResponse(response);
}

/**
 * Creates a standardized error response with message and hangup
 */
export function createErrorResponse(options: ErrorOptions = {}): NextResponse {
    const response = new twilio.twiml.VoiceResponse();
    response.say(
        {
            voice: options.voice || TWIML_DEFAULTS.voice,
            language: TWIML_DEFAULTS.language,
        },
        options.message || TWIML_DEFAULTS.errorMessage
    );
    response.hangup();
    return formatTwiMLResponse(response);
}

/**
 * Creates a simple hangup response (e.g., for machine detection)
 */
export function createSimpleHangupResponse(): NextResponse {
    const response = new twilio.twiml.VoiceResponse();
    response.hangup();
    return formatTwiMLResponse(response);
}

/**
 * Greet the caller, then ask the first question
 */
export function createGreetingWithQuestion(
    greetingAudioUrl?: string,
    greetingText?: string,
    questionOptions?: QuestionOptions
): NextResponse {
    const response = new twilio.twiml.VoiceResponse();

    // Add greeting first (outside of gather)
    addVoiceMessage(response, greetingAudioUrl, greetingText);

    // Then add the gather for the actual question
    if (questionOptions) {
        const gather = response.gather({
            input: ["speech"],
            speechTimeout: (questionOptions.speechTimeout || TWIML_DEFAULTS.speechTimeout).toString(),
            speechModel: questionOptions.speechModel || TWIML_DEFAULTS.speechModel,
            action: questionOptions.actionUrl,
            method: TWIML_DEFAULTS.method,
        });

        // Add the question audio/text to the gather
        addVoiceMessage(gather, questionOptions.audioUrl, questionOptions.fallbackText);

        // Add no-input fallback
        if (questionOptions.noInputMessage) {
            response.say(
                { voice: TWIML_DEFAULTS.voice, language: TWIML_DEFAULTS.language },
                questionOptions.noInputMessage
            );
        }

        if (questionOptions.noInputAction) {
            response.redirect(questionOptions.noInputAction);
        }
    }

    return formatTwiMLResponse(response);
}
