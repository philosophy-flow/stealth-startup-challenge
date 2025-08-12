import { NextRequest, NextResponse } from "next/server";
import { getCallWithPatient, updateCallStatus } from "@/lib/supabase/calls";
import { parseTwilioFormData, processCallCompletion } from "@/utils/calls";
import { log, logError } from "@/utils/logging";

export async function POST(request: NextRequest) {
    try {
        // Parse form data from Twilio
        const formData = await request.formData();
        const params = await parseTwilioFormData(formData);
        const { CallSid: callSid, CallStatus: callStatus, CallDuration: callDuration } = params;

        log("STATUS", `CallSid: ${callSid}, Status: ${callStatus}, Duration: ${callDuration || "N/A"}`);

        // Get call record
        const callRecord = await getCallWithPatient(callSid);
        if (!callRecord) {
            logError("STATUS", "Call record not found", { callSid });
            return new NextResponse("OK", { status: 200 });
        }

        // Process completion and generate update data
        const updateData = await processCallCompletion(callRecord, callStatus, callDuration);

        // Update database
        try {
            await updateCallStatus(callSid, updateData);
        } catch (updateError) {
            logError("STATUS", "Error updating call record", updateError);
        }

        // Twilio expects a 200 OK response
        return new NextResponse("OK", { status: 200 });
    } catch (error) {
        if (error instanceof Error) {
            logError("STATUS", "Webhook error", error);
        } else {
            logError("STATUS", "Webhook error", { error });
        }

        // Still return OK to prevent Twilio retries
        return new NextResponse("OK", { status: 200 });
    }
}