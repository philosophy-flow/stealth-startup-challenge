// Conversation states for the call flow
export enum CallState {
    GREETING = "greeting",
    MOOD_CHECK = "mood_check",
    SCHEDULE_CHECK = "schedule_check",
    MEDICATION_REMINDER = "medication_reminder",
    NUMBER_GAME = "number_game",
    NUMBER_GAME_RESPONSE = "number_game_response",
    CLOSING = "closing",
    ERROR = "error",
    END = "end",
}

// State transition logic
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

    // Positive indicators
    if (
        lowerResult.includes("good") ||
        lowerResult.includes("great") ||
        lowerResult.includes("fine") ||
        lowerResult.includes("well") ||
        lowerResult.includes("wonderful") ||
        lowerResult.includes("excellent")
    ) {
        return "positive";
    }

    // Negative indicators
    if (
        lowerResult.includes("bad") ||
        lowerResult.includes("sad") ||
        lowerResult.includes("tired") ||
        lowerResult.includes("sick") ||
        lowerResult.includes("pain") ||
        lowerResult.includes("hurt")
    ) {
        return "negative";
    }

    // Neutral
    if (lowerResult.includes("okay") || lowerResult.includes("alright") || lowerResult.includes("so-so")) {
        return "neutral";
    }

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

// Generate random numbers for the memory game
export function generateGameNumbers(): number[] {
    const numbers = [];
    for (let i = 0; i < 3; i++) {
        numbers.push(Math.floor(Math.random() * 9) + 1);
    }
    return numbers;
}

// Check if the user correctly recalled the numbers
export function checkGameAnswer(originalNumbers: number[], speechResult: string): boolean {
    // Extract numbers from speech
    const extractedNumbers = speechResult.match(/\d/g);

    if (!extractedNumbers || extractedNumbers.length !== originalNumbers.length) {
        return false;
    }

    // Check if numbers match in order
    for (let i = 0; i < originalNumbers.length; i++) {
        if (parseInt(extractedNumbers[i]) !== originalNumbers[i]) {
            return false;
        }
    }

    return true;
}

// State context to track throughout the call
export interface CallContext {
    patientId: string;
    patientName: string;
    callSid: string;
    currentState: CallState;
    responses: {
        mood?: string;
        schedule?: string;
        medicationTaken?: boolean;
        gameNumbers?: number[];
        gameResult?: boolean;
    };
    transcript: string[];
    startTime: Date;
}

// Update context with response
export function updateCallContext(context: CallContext, state: CallState, speechResult: string): CallContext {
    // Add to transcript
    context.transcript.push(`Patient: ${speechResult}`);

    // Update specific responses based on state
    switch (state) {
        case CallState.MOOD_CHECK:
            context.responses.mood = parseMood(speechResult);
            break;

        case CallState.SCHEDULE_CHECK:
            context.responses.schedule = speechResult;
            break;

        case CallState.MEDICATION_REMINDER:
            context.responses.medicationTaken = parseYesNo(speechResult) ?? false;
            break;

        case CallState.NUMBER_GAME_RESPONSE:
            if (context.responses.gameNumbers) {
                context.responses.gameResult = checkGameAnswer(context.responses.gameNumbers, speechResult);
            }
            break;
    }

    return context;
}
