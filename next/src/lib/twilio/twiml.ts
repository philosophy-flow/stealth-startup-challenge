import twilio from "twilio";

export interface TwiMLConfig {
    audioUrl?: string;
    message?: string;
    gatherConfig?: {
        action: string;
        method?: "POST" | "GET";
        speechTimeout?: number;
        speechModel?: "default" | "numbers_and_commands" | "phone_call" | "experimental_conversations";
    };
}

// Generate TwiML response for voice calls
export function generateTwiML(config: TwiMLConfig): string {
    const response = new twilio.twiml.VoiceResponse();

    // Play audio if URL provided
    if (config.audioUrl) {
        response.play(config.audioUrl);
    }

    // Say message if provided (fallback to Twilio's TTS)
    if (config.message && !config.audioUrl) {
        response.say(
            {
                voice: "alice",
                language: "en-US",
            },
            config.message
        );
    }

    // Set up speech gathering if configured
    if (config.gatherConfig) {
        const gather = response.gather({
            input: ["speech"],
            speechTimeout: (config.gatherConfig.speechTimeout || 3).toString(),
            speechModel: config.gatherConfig.speechModel || "phone_call",
            action: config.gatherConfig.action,
            method: config.gatherConfig.method || "POST",
        });

        // Add a prompt within the gather
        if (config.message && config.audioUrl) {
            gather.say(
                {
                    voice: "alice",
                    language: "en-US",
                },
                "Please respond after the tone."
            );
        }
    }

    return response.toString();
}

// Generate simple TwiML for ending calls
export function generateEndCallTwiML(message?: string): string {
    const response = new twilio.twiml.VoiceResponse();

    if (message) {
        response.say(
            {
                voice: "alice",
                language: "en-US",
            },
            message
        );
    }

    response.hangup();

    return response.toString();
}

// Generate TwiML for playing audio and gathering response
export function generatePlayAndGatherTwiML(audioUrl: string, nextAction: string, fallbackMessage?: string): string {
    const response = new twilio.twiml.VoiceResponse();

    const gather = response.gather({
        input: ["speech"],
        speechTimeout: "3",
        speechModel: "phone_call",
        action: nextAction,
        method: "POST",
    });

    // Play the audio within the gather
    if (audioUrl) {
        gather.play(audioUrl);
    } else if (fallbackMessage) {
        // Fallback to Twilio's TTS if audio generation fails
        gather.say(
            {
                voice: "alice",
                language: "en-US",
            },
            fallbackMessage
        );
    }

    // If no response, repeat
    response.redirect(nextAction);

    return response.toString();
}
