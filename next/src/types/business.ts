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
    NUMBER_GAME_RESPONSE = "number_game_response",
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
    status: "completed" | "failed" | "in_progress";
    call_duration?: number;
    response_data?: Record<string, unknown>;
    [key: string]: unknown; // Allow additional properties for Supabase
}
