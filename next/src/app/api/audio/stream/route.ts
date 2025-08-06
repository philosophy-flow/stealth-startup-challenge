import { NextRequest, NextResponse } from "next/server";
import { openai, calculateTTSCost, logCost } from "@/lib/openai/client";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const text = searchParams.get("text");
        const voice = searchParams.get("voice") as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | null;

        // Validate parameters
        if (!text) {
            return new NextResponse("Missing text parameter", { status: 400 });
        }

        // Security: Limit text length to prevent abuse
        if (text.length > 500) {
            return new NextResponse("Text too long (max 500 characters)", { status: 400 });
        }

        const selectedVoice = voice || "nova";

        // Calculate and log cost
        const cost = calculateTTSCost(text);
        logCost("TTS-Stream", cost, {
            characters: text.length,
            voice: selectedVoice,
            text: text.substring(0, 100),
        });

        console.log(`[TTS-Stream] Generating audio for: "${text.substring(0, 50)}..." with voice: ${selectedVoice}`);

        // Generate audio using OpenAI's cheapest model
        const mp3Response = await openai.audio.speech.create({
            model: "tts-1", // Using cheapest model
            voice: selectedVoice,
            input: text,
            speed: 0.9, // Slightly slower for elderly listeners
        });

        // Get the audio as an ArrayBuffer
        const audioBuffer = await mp3Response.arrayBuffer();

        // Return the audio stream directly
        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error("[TTS-Stream] Error generating audio:", error);
        return new NextResponse("Error generating audio", { status: 500 });
    }
}
