import { CallState } from "./state-machine";

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
            // Generate and include numbers (40-45 chars)
            const numbers = context?.gameNumbers || [3, 7, 2];
            const numberString = numbers.join(", ");
            return `Let's play a memory game. Remember: ${numberString}`;

        case CallState.NUMBER_GAME_RESPONSE:
            // 23 chars
            return "What were those numbers?";

        case CallState.CLOSING:
            // Handle game result (40-50 chars)
            if (context?.gameResult === true) {
                return "Great job! Have a wonderful day!";
            } else if (context?.gameResult === false) {
                const numbers = context?.gameNumbers || [3, 7, 2];
                return `The numbers were ${numbers.join(", ")}. Have a great day!`;
            }
            // Default closing (29 chars)
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

// Calculate total prompt cost for monitoring
export function calculatePromptCost(prompts: string[]): number {
    const totalChars = prompts.reduce((sum, prompt) => sum + prompt.length, 0);
    const costPer1kChars = 0.015; // tts-1 model cost
    return (totalChars / 1000) * costPer1kChars;
}

// Get all prompts for a complete call (for cost estimation)
export function getAllCallPrompts(patientName: string): string[] {
    const firstName = patientName.split(" ")[0];
    const gameNumbers = [3, 7, 2];

    return [
        `Hi ${firstName}, this is your daily check-in call.`,
        "How are you feeling today?",
        "That's wonderful to hear!",
        "What are your plans for today?",
        "Have you taken your medications?",
        "Very good!",
        `Let's play a memory game. Remember: ${gameNumbers.join(", ")}`,
        "What were those numbers?",
        "Great job! Have a wonderful day!",
        "Goodbye!",
    ];
}

// Estimate total call cost
export function estimateCallCost(patientName: string): {
    prompts: string[];
    totalChars: number;
    estimatedCost: number;
} {
    const prompts = getAllCallPrompts(patientName);
    const totalChars = prompts.reduce((sum, prompt) => sum + prompt.length, 0);
    const estimatedCost = calculatePromptCost(prompts);

    return {
        prompts,
        totalChars,
        estimatedCost,
    };
}
