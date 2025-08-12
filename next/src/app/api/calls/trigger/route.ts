import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { twilioClient } from "@/lib/twilio";
import { getAppUrl } from "@/utils/url";
import { formatPhoneNumber } from "@/utils/format";

export async function POST(request: NextRequest) {
    try {
        // Get request body
        const { patientId } = await request.json();

        if (!patientId) {
            return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
        }

        // Verify user is authenticated
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get patient details and verify ownership
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("*")
            .eq("id", patientId)
            .eq("family_member_id", user.id)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: "Patient not found or unauthorized" }, { status: 404 });
        }

        // Format phone number for Twilio
        const formattedPhone = formatPhoneNumber(patient.phone_number);

        // Get the base URL for webhooks
        const webhookBaseUrl = getAppUrl();

        console.log("[TRIGGER] Initiating call to:", formattedPhone);
        console.log("[TRIGGER] Webhook base URL:", webhookBaseUrl);

        // Initiate the call via Twilio
        const call = await twilioClient.calls.create({
            to: formattedPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            url: `${webhookBaseUrl}/api/webhooks/twilio/voice/initial`,
            statusCallback: `${webhookBaseUrl}/api/webhooks/twilio/status`,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
            machineDetection: "Enable",
            machineDetectionTimeout: 3000,
            // Pass patient info as custom parameters
            // Note: These get passed to webhooks
        });

        console.log("[TRIGGER] Call initiated with SID:", call.sid);

        // Create call record in database using admin client (bypasses RLS)
        const { data: callRecord, error: insertError } = await supabaseAdmin
            .from("calls")
            .insert({
                patient_id: patientId,
                call_sid: call.sid,
                status: "initiated",
                call_start_time: new Date().toISOString(),
                response_data: {
                    patient_name: `${patient.first_name} ${patient.last_name}`,
                    call_transcript: "",
                },
            })
            .select()
            .single();

        if (insertError) {
            console.error("[TRIGGER] Error creating call record:", insertError);
            // Call was initiated, so we continue despite DB error
        }

        return NextResponse.json({
            success: true,
            callSid: call.sid,
            callId: callRecord?.id,
            status: call.status,
            message: `Call initiated to ${patient.first_name} ${patient.last_name}`,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[TRIGGER] Error initiating call:", error);

        // Check for Twilio-specific errors
        if (error.code === 20003) {
            return NextResponse.json(
                { error: "Invalid Twilio credentials. Please check your environment variables." },
                { status: 500 }
            );
        }

        if (error.code === 21211) {
            return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
        }

        return NextResponse.json({ error: error.message || "Failed to initiate call" }, { status: 500 });
    }
}
