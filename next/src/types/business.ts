export interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    age?: number;
    location?: string;
    preferred_call_time?: string;
    phone_number: string;
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
