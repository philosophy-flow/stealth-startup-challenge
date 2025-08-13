"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Patient } from "@/types/business";
import type { CallUpdateData } from "@/types/business";

export async function verifyPatientOwnership(patientId: string): Promise<Patient | null> {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return null;
    }

    // Get patient details and verify ownership
    const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .eq("family_member_id", user.id)
        .single();

    if (patientError || !patient) {
        return null;
    }

    return patient;
}

export async function createCallRecord(patientId: string, callSid: string, patientName: string) {
    const { data: callRecord, error: insertError } = await supabaseAdmin
        .from("calls")
        .insert({
            patient_id: patientId,
            call_sid: callSid,
            status: "initiated",
            call_start_time: new Date().toISOString(),
            response_data: {
                patient_name: patientName,
                call_transcript: "",
            },
        })
        .select()
        .single();

    if (insertError) {
        throw new Error(`Failed to create call record: ${insertError.message}`);
    }

    return callRecord;
}

export async function getCallWithPatient(callSid: string) {
    const { data: callRecord, error } = await supabaseAdmin
        .from("calls")
        .select("*, patient:patients(*)")
        .eq("call_sid", callSid)
        .single();

    if (error) {
        return null;
    }

    return callRecord;
}

export async function updateCallStatus(callSid: string, updateData: CallUpdateData) {
    const { error } = await supabaseAdmin.from("calls").update(updateData).eq("call_sid", callSid);

    if (error) {
        throw new Error(`Failed to update call status: ${error.message}`);
    }
}

export async function appendToTranscript(callSid: string, text: string, speaker: "System" | "Patient" = "System") {
    const callRecord = await getCallWithPatient(callSid);
    if (!callRecord) {
        throw new Error(`Call not found: ${callSid}`);
    }

    const currentTranscript = (callRecord.response_data?.call_transcript as string) || "";
    return updateCallStatus(callSid, {
        response_data: {
            ...callRecord.response_data,
            call_transcript: `${currentTranscript}${speaker}: ${text}\n`,
        },
    });
}

export async function updateResponseData(callSid: string, newData: Record<string, unknown>) {
    const callRecord = await getCallWithPatient(callSid);
    if (!callRecord) {
        throw new Error(`Call not found: ${callSid}`);
    }

    return updateCallStatus(callSid, {
        response_data: {
            ...callRecord.response_data,
            ...newData,
        },
    });
}
