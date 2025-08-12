"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Patient } from "@/types/business";

export async function verifyPatientOwnership(patientId: string): Promise<Patient | null> {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
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

export async function createCallRecord(
    patientId: string,
    callSid: string,
    patientName: string
) {
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