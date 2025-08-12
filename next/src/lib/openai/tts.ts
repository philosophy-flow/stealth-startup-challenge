import { openai, calculateTTSCost, logCost } from "./client";
import { audioCache } from "./audio-cache";

// Store generated audio in memory with unique ID
const audioStore = new Map<string, Buffer>();

// Generate TTS audio using OpenAI's cheapest model
export async function generateTTS(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova"
): Promise<string> {
    try {
        // Check cache first
        const cachedBuffer = audioCache.get(text, voice);
        if (cachedBuffer) {
            // Simple stable ID: use voice + hash of text
            const textHash = text.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
            const audioId = `audio_${voice}_${Math.abs(textHash)}`;

            // Only set if not already in store
            if (!audioStore.has(audioId)) {
                audioStore.set(audioId, cachedBuffer);

                // Clean up after 5 minutes
                setTimeout(() => {
                    audioStore.delete(audioId);
                }, 5 * 60 * 1000);
            }

            return `/api/audio/cached/${audioId}`;
        }

        // Generate new audio
        console.log(`[TTS] Generating new audio for: "${text.substring(0, 50)}..." with voice: ${voice}`);

        // Calculate and log cost ONCE
        const cost = calculateTTSCost(text);
        logCost("TTS", cost, {
            characters: text.length,
            voice,
            text: text.substring(0, 100),
        });

        // Generate audio using CHEAPEST model (tts-1, NOT tts-1-hd)
        const mp3Response = await openai.audio.speech.create({
            model: "tts-1", // CRITICAL: Using cheapest model
            voice,
            input: text,
            speed: 0.9, // Slightly slower for elderly listeners
        });

        // Convert to buffer
        const buffer = Buffer.from(await mp3Response.arrayBuffer());

        // Cache the buffer
        audioCache.set(text, voice, buffer);

        // Store in temporary map for serving - use stable ID
        const textHash = text.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
        const audioId = `audio_${voice}_${Math.abs(textHash)}`;

        // Only set if not already in store
        if (!audioStore.has(audioId)) {
            audioStore.set(audioId, buffer);

            // Clean up after 5 minutes
            setTimeout(() => {
                audioStore.delete(audioId);
            }, 5 * 60 * 1000);
        }

        return `/api/audio/cached/${audioId}`;
    } catch (error) {
        console.error("[TTS] Error generating audio:", error);
        throw error;
    }
}

// Get audio buffer by ID (for serving cached audio)
export function getAudioBuffer(audioId: string): Buffer | undefined {
    return audioStore.get(audioId);
}

// Generate a cost-optimized summary and mood using GPT-4o-mini
export async function generateCallSummary(
    transcript: string,
    patientName: string
): Promise<{ summary: string; mood: string }> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // CHEAPEST GPT model
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
            max_tokens: 150, // Slightly increased for JSON response
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const response = completion.choices[0].message.content || "{}";
        const parsed = JSON.parse(response);

        const summary = parsed.summary || "Unable to generate summary.";
        const mood = parsed.mood || "unknown";

        // Log approximate cost (rough estimate)
        const inputTokens = transcript.length / 4; // Rough approximation
        const outputTokens = response.length / 4;
        const cost = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.6;
        logCost("GPT-Summary", cost, {
            inputChars: transcript.length,
            outputChars: response.length,
        });

        return { summary, mood };
    } catch (error) {
        console.error("[GPT] Error generating summary:", error);
        return { summary: "Unable to generate summary.", mood: "unknown" };
    }
}
