import { NextRequest, NextResponse } from "next/server";
import { verifyPatientOwnership, createCallRecord } from "@/lib/supabase/calls";
import { initiatePatientCall } from "@/lib/twilio";
import { log, logError } from "@/utils/logging";

export async function POST(request: NextRequest) {
    try {
        // Get request body
        const { patientId } = await request.json();

        if (!patientId) {
            return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
        }

        // Verify user owns this patient
        const patient = await verifyPatientOwnership(patientId);

        if (!patient) {
            return NextResponse.json({ error: "Patient not found or unauthorized" }, { status: 404 });
        }

        // Initiate the call via Twilio
        const call = await initiatePatientCall(patient.phone_number);

        log("TRIGGER", `Call initiated: ${call.sid} to ${patient.first_name} ${patient.last_name}`);

        // Create call record in database
        let callRecord;
        try {
            callRecord = await createCallRecord(patientId, call.sid, `${patient.first_name} ${patient.last_name}`);
        } catch (dbError) {
            // Call was initiated, so we continue despite DB error
            logError("TRIGGER", "Error creating call record", dbError);
        }

        return NextResponse.json({
            success: true,
            callSid: call.sid,
            callId: callRecord?.id,
            status: call.status,
            message: `Call initiated to ${patient.first_name} ${patient.last_name}`,
        });
    } catch (error) {
        logError("TRIGGER", "Error initiating call", error);
        
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
    }
}
