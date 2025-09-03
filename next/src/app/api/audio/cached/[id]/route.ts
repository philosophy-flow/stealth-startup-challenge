import { NextRequest, NextResponse } from "next/server";
import { getAudioBuffer } from "@/utils/audio";
import { log, logError } from "@/utils/logging";

const AUDIO_HEADERS = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "public, max-age=300", // 5 minutes
};

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const audioId = params.id;

        // Get audio buffer from memory
        const audioBuffer = getAudioBuffer(audioId);

        if (!audioBuffer) {
            log("AudioCached", `Audio not found for ID: ${audioId}`);
            return new NextResponse("Audio not found", { status: 404 });
        }

        log("AudioCached", `Serving cached audio for ID: ${audioId}`);

        return new Response(new Uint8Array(audioBuffer), { headers: AUDIO_HEADERS });
    } catch (error) {
        logError("AudioCached", "Error serving audio", error);
        return new NextResponse("Error serving audio", { status: 500 });
    }
}
