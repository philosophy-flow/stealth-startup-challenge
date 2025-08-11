/* eslint-disable @typescript-eslint/no-explicit-any */
import { CallState } from "@/types/business";

// Cost-optimized prompts - kept ultra-concise to minimize TTS costs
// Target: Keep total call under 300 characters

export function generatePrompt(state: CallState, patientName: string, context?: any): string {
    const firstName = patientName.split(" ")[0];

    switch (state) {
        case CallState.GREETING:
            // 50 chars
            return `Hi ${firstName}, this is your daily check-in call.`;

        case CallState.MOOD_CHECK:
            // 24 chars
            return "How are you feeling today?";

        case CallState.SCHEDULE_CHECK:
            // 28 chars
            return "What are your plans for today?";

        case CallState.MEDICATION_REMINDER:
            // 32 chars
            return "Have you taken your medications?";

        case CallState.NUMBER_GAME:
            // Guessing game prompt (65 chars)
            return "Let's play a guessing game. I'm thinking of a number between 1 and 10. What's your guess?";

        case CallState.NUMBER_GAME_RESPONSE:
            // This state now processes the guess and gives feedback
            if (context?.gameResult === true) {
                const number = context?.secretNumber || 5;
                return `That's right! The number was ${number}. Great job!`;
            } else if (context?.gameResult === false) {
                const number = context?.secretNumber || 5;
                return `Good try! The number was ${number}.`;
            }
            // Shouldn't reach here, but have a fallback
            return "Let's continue.";

        case CallState.CLOSING:
            // Simple closing without game result (already handled above)
            return "Thank you. Have a wonderful day!";

        case CallState.ERROR:
            // 35 chars
            return "Sorry, I didn't catch that. Let's continue.";

        case CallState.END:
            // 8 chars
            return "Goodbye!";

        default:
            return "Thank you for your time.";
    }
}

// Generate response based on what the patient said
export function generateResponsePrompt(state: CallState, patientResponse: string, context?: any): string {
    switch (state) {
        case CallState.MOOD_CHECK:
            const mood = context?.responses?.mood;
            if (mood === "negative") {
                // 35 chars
                return "I'm sorry to hear that. Let me know if you need help.";
            } else if (mood === "positive") {
                // 20 chars
                return "That's wonderful to hear!";
            }
            // 15 chars
            return "Thank you for sharing.";

        case CallState.MEDICATION_REMINDER:
            const medicationTaken = context?.responses?.medicationTaken;
            if (medicationTaken === false) {
                // 45 chars
                return "Please remember to take them soon.";
            }
            // 11 chars
            return "Very good!";

        default:
            return "";
    }
}
