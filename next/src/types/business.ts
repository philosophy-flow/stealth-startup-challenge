export type VoiceType = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    age?: number;
    location?: string;
    preferred_call_time?: string;
    phone_number: string;
    voice?: VoiceType;
    family_member_id: string;
    created_at: string;
    updated_at: string;
}

export interface Call {
    id: string;
    patient_id: string;
    call_sid?: string;
    call_date: string;
    call_start_time?: string;
    call_duration?: number;
    status: "initiated" | "in_progress" | "completed" | "failed";
    recording_url?: string;
    response_data?: {
        overall_mood?: string;
        todays_agenda?: string;
        game_result?: string;
        call_summary?: string;
        call_transcript?: string;
    };
    created_at: string;
    patient?: Patient;
}

// Conversation states for the call flow
export enum CallState {
    GREETING = "greeting",
    MOOD_CHECK = "mood_check",
    SCHEDULE_CHECK = "schedule_check",
    MEDICATION_REMINDER = "medication_reminder",
    NUMBER_GAME = "number_game",
    CLOSING = "closing",
    ERROR = "error",
    END = "end",
}

// Type for Twilio status webhook parameters
export interface TwilioStatusParams {
    CallSid: string;
    CallStatus: string;
    CallDuration?: string;
    [key: string]: string | undefined;
}

export interface CallUpdateData {
    status?: "completed" | "failed" | "in_progress";
    call_duration?: number;
    response_data?: Record<string, unknown>;
    [key: string]: unknown; // Allow additional properties for Supabase
}

// Type for valid Twilio voice options
export type TwilioVoice = "alice" | "man" | "woman" | "Polly.Matthew" | "Polly.Joanna" | "Polly.Ivy" | "Polly.Joey";

// Options for asking a question and waiting for response
export interface QuestionOptions {
    audioUrl?: string; // OpenAI TTS audio URL
    fallbackText?: string; // Text for Twilio's built-in voice if no audio
    actionUrl: string; // Where to send the response
    speechTimeout?: number; // Default: 3
    speechModel?: "phone_call" | "numbers_and_commands"; // Default: 'phone_call'
    noInputAction?: string; // URL to redirect if no input
    noInputMessage?: string; // Message before redirect (default: "Let's continue.")
}

// Options for play and hangup responses
export interface PlayHangupOptions {
    audioUrl?: string;
    fallbackText?: string;
    voice?: TwilioVoice; // Default: 'alice'
}

// Options for error responses
export interface ErrorOptions {
    message?: string; // Default: "I'm sorry, there was an error. Goodbye."
    voice?: TwilioVoice; // Default: 'alice'
}

export interface StateHandler {
    processResponse?: (speechResult: string, responseData: Record<string, unknown>) => void;
    getPrompt: (responseData?: Record<string, unknown>) => string;
    urlPath: string;
    speechModel?: "phone_call" | "numbers_and_commands";
    speechTimeout?: number;
    noInputActionPath?: string;
}
