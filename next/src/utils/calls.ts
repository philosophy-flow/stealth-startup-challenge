import { CallState } from "@/types/business";

// Yes/No response patterns
const YES_PATTERNS = new Set(["yes", "yeah", "yep", "sure", "i have", "i did"]);
const NO_PATTERNS = new Set(["no", "nope", "not", "haven't", "didn't"]);

// Number words for game
const WRITTEN_NUMBERS: Record<string, number> = {
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

// State transition logic
export function getNextState(currentState: CallState): CallState {
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
            return CallState.CLOSING;
        default:
            return CallState.END;
    }
}

// Parse yes/no responses
export function parseYesNo(speechResult: string): boolean | null {
    const lower = speechResult.toLowerCase();

    for (const pattern of YES_PATTERNS) {
        if (lower.includes(pattern)) return true;
    }

    for (const pattern of NO_PATTERNS) {
        if (lower.includes(pattern)) return false;
    }

    return null;
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
        const lower = speechResult.toLowerCase();
        for (const [word, num] of Object.entries(WRITTEN_NUMBERS)) {
            if (lower.includes(word)) {
                return {
                    guess: num,
                    result: num === secretNumber ? "winner" : "loser",
                };
            }
        }
        return { guess: null, result: "invalid" };
    }

    const guess = parseInt(numbers[0]);

    if (guess < 1 || guess > 10) {
        return { guess, result: "invalid" };
    }

    return {
        guess,
        result: guess === secretNumber ? "winner" : "loser",
    };
}
