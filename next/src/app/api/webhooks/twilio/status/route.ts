import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateCallSummary } from "@/lib/openai/tts";

export async function POST(request: NextRequest) {
    try {
        // Parse form data from Twilio
        const formData = await request.formData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: Record<string, any> = {};
        formData.forEach((value, key) => {
            params[key] = value.toString();
        });

        const callSid = params.CallSid;
        const callStatus = params.CallStatus;
        const callDuration = params.CallDuration;

        console.log(`[STATUS] CallSid: ${callSid}, Status: ${callStatus}, Duration: ${callDuration}`);

        // Get call record
        const { data: callRecord, error: callError } = await supabaseAdmin
            .from("calls")
            .select("*, patient:patients(*)")
            .eq("call_sid", callSid)
            .single();

        if (callError || !callRecord) {
            console.error("[STATUS] Call record not found:", callError);
            return new NextResponse("OK", { status: 200 });
        }

        // Update call status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            status:
                callStatus === "completed"
                    ? "completed"
                    : callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer"
                    ? "failed"
                    : "in_progress",
        };

        // Add duration if call completed
        if (callDuration) {
            updateData.call_duration = parseInt(callDuration);
        }

        // If call completed, generate summary
        if (callStatus === "completed") {
            const responseData = callRecord.response_data || {};
            const transcript = responseData.call_transcript || "";
            const patientName = `${callRecord.patient.first_name} ${callRecord.patient.last_name}`;

            // Generate summary and mood if we have a transcript
            if (transcript) {
                try {
                    const { summary, mood } = await generateCallSummary(transcript, patientName);
                    responseData.call_summary = summary;
                    responseData.overall_mood = mood;
                    updateData.response_data = responseData;

                    console.log("[STATUS] Generated summary:", summary, "Mood:", mood);
                } catch (summaryError) {
                    console.error("[STATUS] Failed to generate summary:", summaryError);
                    responseData.call_summary = "Call completed successfully.";
                    responseData.overall_mood = "unknown";
                    updateData.response_data = responseData;
                }
            }

            // Log final call cost estimate
            const charCount = transcript.length;
            const estimatedCost = (charCount / 1000) * 0.015; // TTS cost estimate
            console.log(
                `[STATUS] Call completed. Estimated TTS cost: $${estimatedCost.toFixed(4)} for ${charCount} characters`
            );
        }

        // Update database
        const { error: updateError } = await supabaseAdmin.from("calls").update(updateData).eq("call_sid", callSid);

        if (updateError) {
            console.error("[STATUS] Error updating call record:", updateError);
        }

        // Twilio expects a 200 OK response
        return new NextResponse("OK", { status: 200 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[STATUS] Webhook error:", error);

        // Still return OK to prevent Twilio retries
        return new NextResponse("OK", { status: 200 });
    }
}
