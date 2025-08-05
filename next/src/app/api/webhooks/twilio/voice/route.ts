import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateTwilioWebhook } from "@/lib/twilio/client";
import { generatePlayAndGatherTwiML } from "@/lib/twilio/twiml";
import { generateTTS } from "@/lib/openai/tts";
import { generatePrompt } from "@/lib/call/prompts";
import { CallState } from "@/lib/call/state-machine";

export async function POST(request: NextRequest) {
    try {
        // Parse form data from Twilio
        const formData = await request.formData();
        const params: Record<string, any> = {};
        formData.forEach((value, key) => {
            params[key] = value.toString();
        });

        // Log webhook call
        console.log("[VOICE] Webhook called with CallSid:", params.CallSid);
        console.log("[VOICE] Call status:", params.CallStatus);

        // Validate Twilio webhook signature (skip in development if needed)
        const signature = request.headers.get("X-Twilio-Signature");
        const url = request.url;

        // Skip validation in development if signature is missing
        if (process.env.NODE_ENV === "production" && signature) {
            const isValid = validateTwilioWebhook(process.env.TWILIO_AUTH_TOKEN!, signature, url, params);

            if (!isValid) {
                console.error("[VOICE] Invalid Twilio signature");
                return new NextResponse("Unauthorized", { status: 401 });
            }
        }

        const callSid = params.CallSid;
        const answeredBy = params.AnsweredBy;

        // Handle machine detection
        if (answeredBy === "machine_start" || answeredBy === "fax") {
            console.log("[VOICE] Call answered by machine/fax, hanging up");

            // Update call status
            await supabaseAdmin
                .from("calls")
                .update({
                    status: "failed",
                    response_data: {
                        error: "Answered by machine or fax",
                    },
                })
                .eq("call_sid", callSid);

            // Hang up
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                <Response><Hangup/></Response>`;

            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Get call record from database
        const { data: callRecord, error: callError } = await supabaseAdmin
            .from("calls")
            .select("*, patient:patients(*)")
            .eq("call_sid", callSid)
            .single();

        if (callError || !callRecord) {
            console.error("[VOICE] Call record not found:", callError);
            // Create a simple greeting anyway
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say voice="alice">Hello, this is your daily check-in call.</Say>
                    <Hangup/>
                </Response>`;

            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        }

        // Update call status to in_progress
        await supabaseAdmin
            .from("calls")
            .update({
                status: "in_progress",
                call_start_time: new Date().toISOString(),
            })
            .eq("call_sid", callSid);

        // Generate greeting
        const patientName = `${callRecord.patient.first_name} ${callRecord.patient.last_name}`;
        const greetingText = generatePrompt(CallState.GREETING, patientName);

        console.log("[VOICE] Generating TTS for greeting:", greetingText);

        // Generate TTS audio
        let audioUrl: string;
        try {
            audioUrl = await generateTTS(greetingText, "nova");
            // Make URL absolute
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const fullAudioUrl = audioUrl.startsWith("http")
                ? audioUrl
                : `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}${audioUrl}`;

            console.log("[VOICE] TTS generated, URL:", fullAudioUrl);

            // Add greeting to transcript
            await supabaseAdmin
                .from("calls")
                .update({
                    response_data: {
                        ...callRecord.response_data,
                        patient_name: patientName,
                        call_transcript: `System: ${greetingText}\n`,
                    },
                })
                .eq("call_sid", callSid);

            // Generate TwiML with audio and gather for mood check
            const nextAction = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/gather/mood_check`;
            const twiml = generatePlayAndGatherTwiML(
                fullAudioUrl,
                nextAction,
                greetingText // Fallback text if audio fails
            );

            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        } catch (ttsError) {
            console.error("[VOICE] TTS generation failed:", ttsError);

            // Fallback to Twilio's built-in TTS
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Gather input="speech" speechTimeout="3" speechModel="phone_call"
                            action="${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/gather/mood_check"
                            method="POST">
                        <Say voice="alice">${greetingText}</Say>
                        <Say voice="alice">How are you feeling today?</Say>
                    </Gather>
                    <Say voice="alice">I didn't hear a response. Let's continue.</Say>
                    <Redirect>${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/gather/mood_check</Redirect>
                </Response>`;

            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        }
    } catch (error: any) {
        console.error("[VOICE] Webhook error:", error);

        // Return simple error response
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="alice">I'm sorry, there was an error with your call. Please try again later.</Say>
                <Hangup/>
            </Response>`;

        return new NextResponse(twiml, {
            headers: { "Content-Type": "text/xml" },
        });
    }
}
