import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateTwilioWebhook } from "@/lib/twilio/client";
import { generateTTS } from "@/lib/openai/tts";
import { generatePrompt } from "@/lib/call/prompts";
import { getAppUrl } from "@/utils/url";
import { CallState } from "@/types/business";
import type { VoiceType } from "@/types/business";

export async function POST(request: NextRequest) {
    try {
        // Parse form data from Twilio
        const formData = await request.formData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Hang up using TwiML library
            const response = new twilio.twiml.VoiceResponse();
            response.hangup();

            return new NextResponse(response.toString(), {
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

            // Create a simple greeting anyway using TwiML library
            const response = new twilio.twiml.VoiceResponse();
            response.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "Hello, this is your daily check-in call."
            );
            response.hangup();

            return new NextResponse(response.toString(), {
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

        // Generate greeting and mood question
        const patientName = `${callRecord.patient.first_name} ${callRecord.patient.last_name}`;
        const patientVoice = (callRecord.patient.voice || "nova") as VoiceType;
        const greetingText = generatePrompt(CallState.GREETING, patientName);
        const moodQuestion = generatePrompt(CallState.MOOD_CHECK, patientName);

        console.log("[VOICE] Generating TTS for greeting:", greetingText);
        console.log("[VOICE] Using voice:", patientVoice);

        // Generate TTS audio
        try {
            const greetingAudioUrl = await generateTTS(greetingText, patientVoice);
            const moodAudioUrl = await generateTTS(moodQuestion, patientVoice);

            // Make URLs absolute
            const baseUrl = getAppUrl();
            const fullGreetingUrl = greetingAudioUrl.startsWith("http")
                ? greetingAudioUrl
                : `${baseUrl}${greetingAudioUrl}`;
            const fullMoodUrl = moodAudioUrl.startsWith("http") ? moodAudioUrl : `${baseUrl}${moodAudioUrl}`;

            console.log("[VOICE] TTS generated successfully");

            // Add greeting and mood question to transcript
            await supabaseAdmin
                .from("calls")
                .update({
                    response_data: {
                        ...callRecord.response_data,
                        patient_name: patientName,
                        call_transcript: `System: ${greetingText}\nSystem: ${moodQuestion}\n`,
                    },
                })
                .eq("call_sid", callSid);

            // Generate TwiML using the library
            const response = new twilio.twiml.VoiceResponse();

            // Play greeting
            response.play(fullGreetingUrl);

            // Gather response with mood question
            const gather = response.gather({
                input: ["speech"],
                speechTimeout: "3",
                speechModel: "phone_call",
                action: `${getAppUrl()}/api/webhooks/twilio/gather/mood_check`,
                method: "POST",
            });

            // Play mood question within gather
            gather.play(fullMoodUrl);

            // If no response, continue anyway
            response.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "I didn't hear a response. Let's continue."
            );
            response.redirect(`${getAppUrl()}/api/webhooks/twilio/gather/mood_check`);

            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        } catch (ttsError) {
            console.error("[VOICE] TTS generation failed:", ttsError);

            // Fallback to Twilio's built-in TTS using the library
            const response = new twilio.twiml.VoiceResponse();

            const gather = response.gather({
                input: ["speech"],
                speechTimeout: "3",
                speechModel: "phone_call",
                action: `${getAppUrl()}/api/webhooks/twilio/gather/mood_check`,
                method: "POST",
            });

            gather.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                greetingText
            );
            gather.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "How are you feeling today?"
            );

            response.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "I didn't hear a response. Let's continue."
            );
            response.redirect(`${getAppUrl()}/api/webhooks/twilio/gather/mood_check`);

            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[VOICE] Webhook error:", error);

        // Return simple error response using TwiML library
        const response = new twilio.twiml.VoiceResponse();
        response.say(
            {
                voice: "alice",
                language: "en-US",
            },
            "I'm sorry, there was an error with your call. Please try again later."
        );
        response.hangup();

        return new NextResponse(response.toString(), {
            headers: { "Content-Type": "text/xml" },
        });
    }
}
