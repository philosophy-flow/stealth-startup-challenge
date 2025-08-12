import { NextRequest, NextResponse } from "next/server";
import { getAudioBuffer } from "@/utils/audio";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const audioId = params.id;

        // Get audio buffer from memory
        const audioBuffer = getAudioBuffer(audioId);

        if (!audioBuffer) {
            console.log(`[AudioCached] Audio not found for ID: ${audioId}`);
            return new NextResponse("Audio not found", { status: 404 });
        }

        console.log(`[AudioCached] Serving cached audio for ID: ${audioId}`);

        // Return the audio buffer as a Response

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Response(audioBuffer as any, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=300", // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error("[AudioCached] Error serving audio:", error);
        return new NextResponse("Error serving audio", { status: 500 });
    }
}
