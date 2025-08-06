import { openai, calculateTTSCost, logCost } from "./client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Cache for common phrases to avoid regenerating
const CACHED_PHRASES: Record<string, string> = {};

// Common phrases that can be pre-cached
export const COMMON_PHRASES = {
    greeting: "Hello! This is your daily check-in call.",
    mood_check: "How are you feeling today?",
    schedule_check: "What are your plans for today?",
    medication_reminder: "Have you taken your medications?",
    game_intro: "Let's play a quick memory game. Remember these numbers.",
    closing: "Thank you for chatting. Have a wonderful day!",
    error: "I'm sorry, I didn't catch that. Could you repeat?",
    goodbye: "Goodbye!",
};

// Generate TTS audio using OpenAI's cheapest model
export async function generateTTS(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova"
): Promise<string> {
    try {
        // Check cache first
        const cacheKey = `${text}_${voice}`;
        if (CACHED_PHRASES[cacheKey]) {
            console.log("[TTS] Using cached audio for:", text.substring(0, 50));
            return CACHED_PHRASES[cacheKey];
        }

        // Calculate and log cost
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

        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const filename = `tts_${timestamp}_${random}.mp3`;

        // Ensure temp directory exists
        const tempDir = join(process.cwd(), "public", "temp", "audio");
        if (!existsSync(tempDir)) {
            await mkdir(tempDir, { recursive: true });
        }

        // Save to temporary file
        const filepath = join(tempDir, filename);
        await writeFile(filepath, buffer);

        // Generate public URL
        const publicUrl = `/temp/audio/${filename}`;

        // Cache common phrases
        if (Object.values(COMMON_PHRASES).includes(text)) {
            CACHED_PHRASES[cacheKey] = publicUrl;
        }

        return publicUrl;
    } catch (error) {
        console.error("[TTS] Error generating audio:", error);
        throw error;
    }
}

// Generate a cost-optimized summary using GPT-4o-mini
export async function generateCallSummary(transcript: string, patientName: string): Promise<string> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // CHEAPEST GPT model
            messages: [
                {
                    role: "system",
                    content:
                        "Summarize this elderly patient call in 1-2 concise sentences. Focus on mood and any concerns.",
                },
                {
                    role: "user",
                    content: `Patient: ${patientName}\nTranscript: ${transcript}`,
                },
            ],
            max_tokens: 100, // Limit output to control costs
            temperature: 0.7,
        });

        const summary = completion.choices[0].message.content || "";

        // Log approximate cost (rough estimate)
        const inputTokens = transcript.length / 4; // Rough approximation
        const outputTokens = summary.length / 4;
        const cost = (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.6;
        logCost("GPT-Summary", cost, {
            inputChars: transcript.length,
            outputChars: summary.length,
        });

        return summary;
    } catch (error) {
        console.error("[GPT] Error generating summary:", error);
        return "Unable to generate summary.";
    }
}

// Pre-generate common phrase audio on startup (optional)
export async function pregenerateCachedAudio(): Promise<void> {
    console.log("[TTS] Pre-generating common phrases...");

    for (const [key, text] of Object.entries(COMMON_PHRASES)) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const url = await generateTTS(text, "nova");
            console.log(`[TTS] Pre-generated: ${key}`);
        } catch (error) {
            console.error(`[TTS] Failed to pre-generate ${key}:`, error);
        }
    }

    console.log("[TTS] Pre-generation complete");
}

// Clean up old audio files (call periodically)
export async function cleanupOldAudioFiles(): Promise<void> {
    // Implementation for cleaning up old temp files
    // This would be run periodically to prevent disk space issues
    console.log("[TTS] Cleanup not yet implemented");
}
