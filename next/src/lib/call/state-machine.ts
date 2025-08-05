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
        "not well",
        "not great",
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
