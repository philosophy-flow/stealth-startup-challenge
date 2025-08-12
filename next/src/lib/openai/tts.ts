import { openai, calculateTTSCost, logCost } from "./client";
import { getFromCache, storeAudio, generateAudioId } from "@/utils/audio";

const pendingRequests = new Map<string, Promise<Buffer>>();

export async function generateTTS(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova"
): Promise<string> {
    try {
        const cachedBuffer = getFromCache(text, voice);
        if (cachedBuffer) {
            const audioId = generateAudioId(text, voice);
            return `/api/audio/cached/${audioId}`;
        }

        const requestKey = `${text}\x00${voice}`;
        const pending = pendingRequests.get(requestKey);
        if (pending) {
            console.log(`[TTS] Waiting for pending request: "${text.substring(0, 50)}..." with voice: ${voice}`);
            const buffer = await pending;
            const audioId = generateAudioId(text, voice);
            return `/api/audio/cached/${audioId}`;
        }

        console.log(`[TTS] Generating new audio for: "${text.substring(0, 50)}..." with voice: ${voice}`);

        const cost = calculateTTSCost(text);
        logCost("TTS", cost, {
            characters: text.length,
            voice,
            text: text.substring(0, 100),
        });

        const audioPromise = openai.audio.speech.create({
            model: "tts-1",
            voice,
            input: text,
            speed: 0.9,
        }).then(response => response.arrayBuffer())
          .then(arrayBuffer => Buffer.from(arrayBuffer));

        pendingRequests.set(requestKey, audioPromise);

        try {
            const buffer = await audioPromise;

            const audioId = storeAudio(text, voice, buffer);

            return `/api/audio/cached/${audioId}`;
        } finally {
            pendingRequests.delete(requestKey);
        }
    } catch (error) {
        console.error("[TTS] Error generating audio:", error);
        throw error;
    }
}

export async function generateCallSummary(
    transcript: string,
    patientName: string
): Promise<{ summary: string; mood: string }> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "Summarize this elderly patient call in 1-2 concise sentences. Also classify the overall mood as exactly one of: positive, negative, or neutral. Return JSON format: {summary: string, mood: string}",
                },
                {
                    role: "user",
                    content: `Patient: ${patientName}\nTranscript: ${transcript}`,
                },
            ],
            max_tokens: 150,
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const response = completion.choices[0].message.content || "{}";
        const parsed = JSON.parse(response);

        const summary = parsed.summary || "Unable to generate summary.";
        const mood = parsed.mood || "unknown";

        if (completion.usage) {
            const inputTokens = completion.usage.prompt_tokens;
            const outputTokens = completion.usage.completion_tokens;
            const cost = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.6;
            logCost("GPT-Summary", cost, {
                inputTokens,
                outputTokens,
                totalTokens: completion.usage.total_tokens,
            });
        }

        return { summary, mood };
    } catch (error) {
        console.error("[GPT] Error generating summary:", error);
        return { summary: "Unable to generate summary.", mood: "unknown" };
    }
}
