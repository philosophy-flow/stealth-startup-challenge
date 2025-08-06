import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generatePlayAndGatherTwiML, generateEndCallTwiML } from "@/lib/twilio/twiml";
import { generateTTS } from "@/lib/openai/tts";
import { generatePrompt, generateResponsePrompt } from "@/lib/call/prompts";
import {
    CallState,
    getNextState,
    parseMood,
    parseYesNo,
    generateSecretNumber,
    checkNumberGuess,
} from "@/lib/call/state-machine";
import { getAppUrl } from "@/lib/url";
import type { VoiceType } from "@/types/business";

// Map URL state to CallState enum
function mapUrlToCallState(urlState: string): CallState {
    switch (urlState) {
        case "mood_check":
            return CallState.MOOD_CHECK;
        case "schedule_check":
            return CallState.SCHEDULE_CHECK;
        case "medication_reminder":
            return CallState.MEDICATION_REMINDER;
        case "number_game":
            return CallState.NUMBER_GAME;
        case "number_game_response":
            return CallState.NUMBER_GAME_RESPONSE;
        case "closing":
            return CallState.CLOSING;
        default:
            return CallState.ERROR;
    }
}

export async function POST(request: NextRequest, { params }: { params: { state: string } }) {
    const { state } = await params;
    try {
        // Parse form data from Twilio
        const formData = await request.formData();
        const twilioParams: Record<string, any> = {};
        formData.forEach((value, key) => {
            twilioParams[key] = value.toString();
        });

        const callSid = twilioParams.CallSid;
        const speechResult = twilioParams.SpeechResult || "";
        const currentState = mapUrlToCallState(state);

        console.log(`[GATHER] State: ${state}, CallSid: ${callSid}`);
        console.log(`[GATHER] Speech result: "${speechResult}"`);

        // Get call record
        const { data: callRecord, error: callError } = await supabaseAdmin
            .from("calls")
            .select("*, patient:patients(*)")
            .eq("call_sid", callSid)
            .single();

        if (callError || !callRecord) {
            console.error("[GATHER] Call record not found:", callError);
            const twiml = generateEndCallTwiML("Sorry, there was an error. Goodbye.");
            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        }

        const patientName = `${callRecord.patient.first_name} ${callRecord.patient.last_name}`;
        const patientVoice = (callRecord.patient.voice || "nova") as VoiceType;
        const responseData = callRecord.response_data || {};
        let transcript = responseData.call_transcript || "";

        // Process the current state and speech result
        switch (currentState) {
            case CallState.MOOD_CHECK:
                const mood = parseMood(speechResult);
                responseData.overall_mood = mood;
                transcript += `Patient: ${speechResult}\n`;

                // Generate appropriate response
                const moodResponse = generateResponsePrompt(CallState.MOOD_CHECK, speechResult, {
                    responses: { mood },
                });
                if (moodResponse) {
                    transcript += `System: ${moodResponse}\n`;
                }
                break;

            case CallState.SCHEDULE_CHECK:
                responseData.todays_agenda = speechResult;
                transcript += `Patient: ${speechResult}\n`;
                break;

            case CallState.MEDICATION_REMINDER:
                const medicationTaken = parseYesNo(speechResult);
                responseData.medication_taken = medicationTaken;
                transcript += `Patient: ${speechResult}\n`;

                const medResponse = generateResponsePrompt(CallState.MEDICATION_REMINDER, speechResult, {
                    responses: { medicationTaken },
                });
                if (medResponse) {
                    transcript += `System: ${medResponse}\n`;
                }
                break;

            case CallState.NUMBER_GAME:
                break;

            case CallState.NUMBER_GAME_RESPONSE:
                // Check the player's guess
                const secret = generateSecretNumber();
                const isCorrect = checkNumberGuess(secret, speechResult);
                responseData.game_result = isCorrect ? "winner" : "loser";
                transcript += `Patient: ${speechResult}\n`;

                // Generate feedback response that will be spoken
                const gameResponse = generatePrompt(CallState.NUMBER_GAME_RESPONSE, patientName, {
                    gameResult: isCorrect,
                    secretNumber: secret,
                });
                transcript += `System: ${gameResponse}\n`;

                // Save game outcome
                responseData.game_result = isCorrect ? "winner" : "loser";

                // Store the feedback to be spoken
                responseData.gameFeedback = gameResponse;
                break;

            case CallState.CLOSING:
                // Final state, just process any last response
                if (speechResult) {
                    transcript += `Patient: ${speechResult}\n`;
                }
                break;
        }

        // Update transcript in database
        responseData.call_transcript = transcript;
        await supabaseAdmin.from("calls").update({ response_data: responseData }).eq("call_sid", callSid);

        // Determine next state
        const nextState = getNextState(currentState);

        // Handle end of call
        if (nextState === CallState.END) {
            console.log("[GATHER] Call ending");

            // Generate closing message based on context
            const closingText = generatePrompt(CallState.CLOSING, patientName, responseData);

            try {
                const audioUrl = await generateTTS(closingText, patientVoice);
                const baseUrl = getAppUrl();
                const fullAudioUrl = `${baseUrl}${audioUrl}`;

                const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                    <Response>
                        <Play>${fullAudioUrl}</Play>
                        <Hangup/>
                    </Response>`;

                return new NextResponse(twiml, {
                    headers: { "Content-Type": "text/xml" },
                });
            } catch (error) {
                // Fallback to built-in TTS
                const twiml = generateEndCallTwiML(closingText);
                return new NextResponse(twiml, {
                    headers: { "Content-Type": "text/xml" },
                });
            }
        }

        // Generate prompt for next state
        // Special case: if we just processed NUMBER_GAME_RESPONSE, use the feedback we already generated
        let nextPrompt: string;
        if (currentState === CallState.NUMBER_GAME_RESPONSE && responseData.gameFeedback) {
            // Use the game feedback (winner/loser announcement) as the next prompt
            nextPrompt = responseData.gameFeedback;
        } else {
            // Generate normal prompt for next state
            nextPrompt = generatePrompt(nextState, patientName, responseData);
            transcript += `System: ${nextPrompt}\n`;
        }

        // Update transcript with system prompt (if not already added for game feedback)
        responseData.call_transcript = transcript;
        await supabaseAdmin.from("calls").update({ response_data: responseData }).eq("call_sid", callSid);

        console.log(`[GATHER] Moving to state: ${nextState}, prompt: ${nextPrompt}`);

        // Generate TTS for next prompt
        try {
            const audioUrl = await generateTTS(nextPrompt, patientVoice);
            const baseUrl = getAppUrl();
            const fullAudioUrl = `${baseUrl}${audioUrl}`;

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

            // Special handling for number game - gather the guess directly
            if (nextState === CallState.NUMBER_GAME) {
                // Ask for the guess and gather response
                const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                    <Response>
                        <Gather input="speech" speechTimeout="4" speechModel="numbers_and_commands"
                                action="${baseUrl}/api/webhooks/twilio/gather/number_game_response"
                                method="POST">
                            <Play>${fullAudioUrl}</Play>
                        </Gather>
                        <Say voice="alice">Let's continue.</Say>
                        <Redirect>${baseUrl}/api/webhooks/twilio/gather/closing</Redirect>
                    </Response>`;

                return new NextResponse(twiml, {
                    headers: { "Content-Type": "text/xml" },
                });
            }

            // Generate standard gather TwiML
            const twiml = generatePlayAndGatherTwiML(fullAudioUrl, nextAction, nextPrompt);

            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        } catch (ttsError) {
            console.error("[GATHER] TTS generation failed:", ttsError);

            // Fallback to Twilio's built-in TTS
            const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Gather input="speech" speechTimeout="3" speechModel="phone_call"
                            action="${getAppUrl()}/api/webhooks/twilio/gather/${params.state}"
                            method="POST">
                        <Say voice="alice">${nextPrompt}</Say>
                    </Gather>
                    <Say voice="alice">Let's continue.</Say>
                    <Redirect>${getAppUrl()}/api/webhooks/twilio/gather/closing</Redirect>
                </Response>`;

            return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
            });
        }
    } catch (error: any) {
        console.error("[GATHER] Error:", error);

        const twiml = generateEndCallTwiML("Sorry, there was an error. Goodbye.");
        return new NextResponse(twiml, {
            headers: { "Content-Type": "text/xml" },
        });
    }
}
