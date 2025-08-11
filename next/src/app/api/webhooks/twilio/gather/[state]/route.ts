import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateTTS } from "@/lib/openai/tts";
import { generatePrompt, generateResponsePrompt } from "@/lib/call/prompts";
import { getNextState, parseMood, parseSchedule, parseYesNo, processNumberGame } from "@/lib/call/state-machine";
import { getAppUrl } from "@/utils/url";
import { CallState } from "@/types/business";
import type { VoiceType } from "@/types/business";

export async function POST(request: NextRequest, context: { params: Promise<{ state: string }> }) {
    try {
        const params = await context.params;
        const currentState = params.state as string;

        // Parse form data from Twilio
        const formData = await request.formData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const twilioParams: Record<string, any> = {};
        formData.forEach((value, key) => {
            twilioParams[key] = value.toString();
        });

        const callSid = twilioParams.CallSid;
        const speechResult = twilioParams.SpeechResult || "";

        console.log(`[GATHER] State: ${currentState}, CallSid: ${callSid}`);
        console.log(`[GATHER] Speech result: "${speechResult}"`);

        // Get call record from database
        const { data: callRecord, error: callError } = await supabaseAdmin
            .from("calls")
            .select("*, patient:patients(*)")
            .eq("call_sid", callSid)
            .single();

        if (callError || !callRecord) {
            console.error("[GATHER] Call record not found:", callError);

            // Return error message using TwiML library
            const response = new twilio.twiml.VoiceResponse();
            response.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "I'm sorry, I can't continue with this call."
            );
            response.hangup();

            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        }

        const patientName = `${callRecord.patient.first_name} ${callRecord.patient.last_name}`;
        const patientVoice = (callRecord.patient.voice || "nova") as VoiceType;

        // Get existing response data
        const responseData = callRecord.response_data || {};
        let transcript = responseData.call_transcript || "";

        // Add patient response to transcript
        if (speechResult) {
            transcript += `Patient: ${speechResult}\n`;
        }

        // Map state string to enum
        const stateMap: Record<string, CallState> = {
            mood_check: CallState.MOOD_CHECK,
            schedule_check: CallState.SCHEDULE_CHECK,
            medication_reminder: CallState.MEDICATION_REMINDER,
            number_game: CallState.NUMBER_GAME,
            number_game_response: CallState.NUMBER_GAME_RESPONSE,
            closing: CallState.CLOSING,
        };

        const state = stateMap[currentState] || CallState.ERROR;

        // Process response based on current state
        switch (state) {
            case CallState.MOOD_CHECK:
                responseData.overall_mood = parseMood(speechResult);
                break;

            case CallState.SCHEDULE_CHECK:
                responseData.todays_agenda = parseSchedule(speechResult);
                break;

            case CallState.MEDICATION_REMINDER:
                responseData.medications_taken = parseYesNo(speechResult);
                break;

            case CallState.NUMBER_GAME:
                // This case never runs due to special handling that jumps directly to NUMBER_GAME_RESPONSE
                // Keeping empty for state machine completeness
                break;

            case CallState.NUMBER_GAME_RESPONSE:
                // Generate fresh secret number (like the old code did before refactor)
                const secretNumber = Math.floor(Math.random() * 10) + 1;
                const gameResult = processNumberGame(speechResult, secretNumber);
                responseData.patient_guess = gameResult.guess;
                responseData.game_result = gameResult.result;
                responseData.secret_number = secretNumber; // Store for feedback message

                // Generate feedback message for the game
                let gameFeedback = "";
                if (gameResult.result === "winner") {
                    gameFeedback = generateResponsePrompt(state, gameResult.result, {
                        guess: gameResult.guess,
                        secretNumber: secretNumber,
                    });
                } else {
                    gameFeedback = `Good try! The number was ${secretNumber}.`;
                }
                responseData.gameFeedback = gameFeedback;
                transcript += `System: ${gameFeedback}\n`;
                break;

            case CallState.CLOSING:
                // Patient said something during closing, just acknowledge
                if (speechResult) {
                    console.log("[GATHER] Patient response during closing:", speechResult);
                }
                break;
        }

        // Update call with latest response data and transcript
        await supabaseAdmin
            .from("calls")
            .update({
                response_data: {
                    ...responseData,
                    call_transcript: transcript,
                },
            })
            .eq("call_sid", callSid);

        // Get next state
        const nextState = getNextState(state);

        // If we're ending the call
        if (nextState === CallState.END || state === CallState.CLOSING) {
            console.log("[GATHER] Call ending");

            // Generate closing message based on context
            const closingText = generatePrompt(CallState.CLOSING, patientName, responseData);

            try {
                const audioUrl = await generateTTS(closingText, patientVoice);
                const baseUrl = getAppUrl();
                const fullAudioUrl = audioUrl.startsWith("http") ? audioUrl : `${baseUrl}${audioUrl}`;

                // Generate TwiML using the library
                const response = new twilio.twiml.VoiceResponse();
                response.play(fullAudioUrl);
                response.hangup();

                return new NextResponse(response.toString(), {
                    headers: { "Content-Type": "text/xml" },
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                // Fallback to built-in TTS
                const response = new twilio.twiml.VoiceResponse();
                response.say(
                    {
                        voice: "alice",
                        language: "en-US",
                    },
                    closingText
                );
                response.hangup();

                return new NextResponse(response.toString(), {
                    headers: { "Content-Type": "text/xml" },
                });
            }
        }

        // Generate prompt for next state
        // Special case: if we just processed NUMBER_GAME_RESPONSE, use the feedback we already generated
        let nextPrompt: string;
        if (state === CallState.NUMBER_GAME_RESPONSE && responseData.gameFeedback) {
            // Use the game feedback (winner/loser announcement) as the next prompt
            nextPrompt = responseData.gameFeedback;
        } else {
            // Generate normal prompt for next state
            nextPrompt = generatePrompt(nextState, patientName, responseData);
            transcript += `System: ${nextPrompt}\n`;
        }

        console.log(`[GATHER] Moving to state: ${nextState}, prompt: ${nextPrompt}`);

        // Generate TTS for next prompt
        try {
            const audioUrl = await generateTTS(nextPrompt, patientVoice);
            const baseUrl = getAppUrl();
            const fullAudioUrl = audioUrl.startsWith("http") ? audioUrl : `${baseUrl}${audioUrl}`;

            // Map next state to URL
            let nextStateUrl = "";
            switch (nextState) {
                case CallState.MOOD_CHECK:
                    nextStateUrl = "mood_check";
                    break;
                case CallState.SCHEDULE_CHECK:
                    nextStateUrl = "schedule_check";
                    break;
                case CallState.MEDICATION_REMINDER:
                    nextStateUrl = "medication_reminder";
                    break;
                case CallState.NUMBER_GAME:
                    nextStateUrl = "number_game";
                    break;
                case CallState.NUMBER_GAME_RESPONSE:
                    nextStateUrl = "number_game_response";
                    break;
                case CallState.CLOSING:
                    nextStateUrl = "closing";
                    break;
                default:
                    nextStateUrl = "closing";
            }

            const nextAction = `${baseUrl}/api/webhooks/twilio/gather/${nextStateUrl}`;

            // Generate TwiML using the library
            const response = new twilio.twiml.VoiceResponse();

            // Special handling for number game - gather the guess directly
            if (nextState === CallState.NUMBER_GAME) {
                const gather = response.gather({
                    input: ["speech"],
                    speechTimeout: "4",
                    speechModel: "numbers_and_commands",
                    action: `${baseUrl}/api/webhooks/twilio/gather/number_game_response`,
                    method: "POST",
                });
                gather.play(fullAudioUrl);

                // Fallback if no response
                response.say(
                    {
                        voice: "alice",
                        language: "en-US",
                    },
                    "Let's continue."
                );
                response.redirect(`${baseUrl}/api/webhooks/twilio/gather/closing`);

                return new NextResponse(response.toString(), {
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // Normal gather flow
            const gather = response.gather({
                input: ["speech"],
                speechTimeout: "3",
                speechModel: "phone_call",
                action: nextAction,
                method: "POST",
            });
            gather.play(fullAudioUrl);

            // Fallback if no response
            response.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "Let's continue."
            );
            response.redirect(nextAction);

            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        } catch (ttsError) {
            console.error("[GATHER] TTS generation failed:", ttsError);

            // Fallback to Twilio's built-in TTS using the library
            const response = new twilio.twiml.VoiceResponse();

            const gather = response.gather({
                input: ["speech"],
                speechTimeout: "3",
                speechModel: "phone_call",
                action: `${getAppUrl()}/api/webhooks/twilio/gather/${state}`,
                method: "POST",
            });

            gather.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                nextPrompt
            );

            response.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "Let's continue."
            );
            response.redirect(`${getAppUrl()}/api/webhooks/twilio/gather/closing`);

            return new NextResponse(response.toString(), {
                headers: { "Content-Type": "text/xml" },
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("[GATHER] Error:", error);

        // Return error response using TwiML library
        const response = new twilio.twiml.VoiceResponse();
        response.say(
            {
                voice: "alice",
                language: "en-US",
            },
            "I'm sorry, there was an error. Goodbye."
        );
        response.hangup();

        return new NextResponse(response.toString(), {
            headers: { "Content-Type": "text/xml" },
        });
    }
}
