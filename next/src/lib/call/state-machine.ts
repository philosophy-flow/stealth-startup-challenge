import { CallState } from "@/types/business";

// State transition logic
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getNextState(currentState: CallState, response?: string): CallState {
    switch (currentState) {
        case CallState.GREETING:
            return CallState.MOOD_CHECK;

        case CallState.MOOD_CHECK:
            return CallState.SCHEDULE_CHECK;

        case CallState.SCHEDULE_CHECK:
            return CallState.MEDICATION_REMINDER;

        case CallState.MEDICATION_REMINDER:
            return CallState.NUMBER_GAME;

        case CallState.NUMBER_GAME:
            return CallState.NUMBER_GAME_RESPONSE;

        case CallState.NUMBER_GAME_RESPONSE:
            return CallState.CLOSING;

        case CallState.CLOSING:
            return CallState.END;

        case CallState.ERROR:
            // Try to recover by moving to the next logical state
            return CallState.CLOSING;

        default:
            return CallState.END;
    }
}

// Parse mood from speech recognition result
export function parseMood(speechResult: string): string {
    const lowerResult = speechResult.toLowerCase();

    // Positive indicators - comprehensive list for elderly patients
    const positiveKeywords = [
        "good",
        "great",
        "fine",
        "well",
        "wonderful",
        "excellent",
        "fantastic",
        "happy",
        "cheerful",
        "blessed",
        "thankful",
        "grateful",
        "optimistic",
        "content",
        "peaceful",
        "comfortable",
        "rested",
        "energetic",
        "lively",
        "better",
        "improving",
        "positive",
        "healthy",
        "strong",
        "capable",
        "joyful",
        "delighted",
        "pleased",
        "satisfied",
        "relaxed",
        "calm",
        "refreshed",
        "vigorous",
        "spirited",
        "upbeat",
        "bright",
        "super",
    ];

    // Negative indicators - comprehensive list for elderly patients
    const negativeKeywords = [
        "bad",
        "sad",
        "tired",
        "sick",
        "pain",
        "hurt",
        "awful",
        "terrible",
        "lonely",
        "anxious",
        "worried",
        "depressed",
        "down",
        "unwell",
        "poorly",
        "aching",
        "exhausted",
        "weak",
        "confused",
        "frustrated",
        "scared",
        "uncomfortable",
        "miserable",
        "unhappy",
        "distressed",
        "struggling",
        "difficult",
        "hard",
        "rough",
        "suffering",
        "fearful",
        "nervous",
        "upset",
        "troubled",
        "discouraged",
        "hopeless",
        "ill",
        "fatigued",
        "weary",
        "drained",
        "sore",
        "stiff",
        "dizzy",
        "nauseous",
    ];

    // Neutral indicators
    const neutralKeywords = [
        "okay",
        "alright",
        "so-so",
        "fair",
        "moderate",
        "usual",
        "normal",
        "same",
        "regular",
        "average",
        "mediocre",
        "not bad",
        "not great",
        "could be better",
        "could be worse",
        "managing",
        "surviving",
    ];

    // Common elderly phrases that indicate mood
    const positivePhrases = [
        "can't complain",
        "no complaints",
        "doing well",
        "feeling good",
        "pretty good",
        "quite well",
        "very well",
        "really good",
    ];

    const negativePhrases = [
        "not so good",
        "not good",
        "not so well",
        "not great",
        "not so great",
        "been better",
        "having trouble",
        "having a hard time",
        "not feeling",
        "under the weather",
    ];

    const neutralPhrases = [
        "hanging in there",
        "getting by",
        "making do",
        "getting along",
        "same old",
        "nothing new",
        "status quo",
    ];

    // Check for phrases first (they're more specific)
    for (const phrase of positivePhrases) {
        if (lowerResult.includes(phrase)) {
            return "positive";
        }
    }

    for (const phrase of negativePhrases) {
        if (lowerResult.includes(phrase)) {
            return "negative";
        }
    }

    for (const phrase of neutralPhrases) {
        if (lowerResult.includes(phrase)) {
            return "neutral";
        }
    }

    // Then check individual keywords
    for (const keyword of positiveKeywords) {
        if (lowerResult.includes(keyword)) {
            return "positive";
        }
    }

    for (const keyword of negativeKeywords) {
        if (lowerResult.includes(keyword)) {
            return "negative";
        }
    }

    for (const keyword of neutralKeywords) {
        if (lowerResult.includes(keyword)) {
            return "neutral";
        }
    }

    // If still no match, return unknown
    return "unknown";
}

// Parse yes/no responses
export function parseYesNo(speechResult: string): boolean | null {
    const lowerResult = speechResult.toLowerCase();

    if (
        lowerResult.includes("yes") ||
        lowerResult.includes("yeah") ||
        lowerResult.includes("yep") ||
        lowerResult.includes("sure") ||
        lowerResult.includes("i have") ||
        lowerResult.includes("i did")
    ) {
        return true;
    }

    if (
        lowerResult.includes("no") ||
        lowerResult.includes("nope") ||
        lowerResult.includes("not") ||
        lowerResult.includes("haven't") ||
        lowerResult.includes("didn't")
    ) {
        return false;
    }

    return null;
}

// Parse schedule from speech recognition result
export function parseSchedule(speechResult: string): string {
    // Simply return the speech result as the schedule description
    // More sophisticated parsing could be added here
    return speechResult || "No specific plans mentioned";
}

// Process number game response
export function processNumberGame(
    speechResult: string,
    secretNumber: number
): {
    guess: number | null;
    result: "winner" | "loser" | "invalid";
} {
    // Extract number from speech
    const numbers = speechResult.match(/\d+/);

    if (!numbers || numbers.length === 0) {
        // Try to parse written numbers
        const writtenNumbers: Record<string, number> = {
            one: 1,
            two: 2,
            three: 3,
            four: 4,
            five: 5,
            six: 6,
            seven: 7,
            eight: 8,
            nine: 9,
            ten: 10,
        };

        const lowerResult = speechResult.toLowerCase();
        for (const [word, num] of Object.entries(writtenNumbers)) {
            if (lowerResult.includes(word)) {
                const isWinner = num === secretNumber;
                return {
                    guess: num,
                    result: isWinner ? "winner" : "loser",
                };
            }
        }

        return {
            guess: null,
            result: "invalid",
        };
    }

    const guess = parseInt(numbers[0]);

    if (guess < 1 || guess > 10) {
        return {
            guess,
            result: "invalid",
        };
    }

    const isWinner = guess === secretNumber;
    return {
        guess,
        result: isWinner ? "winner" : "loser",
    };
}
