import { CallState } from "@/types/business";
import { parseYesNo, processNumberGame } from "@/utils/calls";
import type { StateHandler } from "@/types/business";

export const STATE_CONFIG: Record<CallState, StateHandler> = {
    [CallState.GREETING]: {
        getPrompt: () => "Hi, this is your daily check-in call.",
        urlPath: "greeting",
    },

    [CallState.MOOD_CHECK]: {
        processResponse: (_speechResult, responseData) => {
            // Mood will be determined by AI at call completion
            responseData.overall_mood = "unknown";
        },
        getPrompt: () => "How are you feeling today?",
        urlPath: "mood_check",
    },

    [CallState.SCHEDULE_CHECK]: {
        processResponse: (speechResult, responseData) => {
            responseData.todays_agenda = speechResult || "No specific plans mentioned";
        },
        getPrompt: () => "What are your plans for today?",
        urlPath: "schedule_check",
    },

    [CallState.MEDICATION_REMINDER]: {
        processResponse: (speechResult, responseData) => {
            responseData.medications_taken = parseYesNo(speechResult);
        },
        getPrompt: () => "Have you taken your medications?",
        urlPath: "medication_reminder",
    },

    [CallState.NUMBER_GAME]: {
        processResponse: (speechResult, responseData) => {
            // Generate fresh secret number
            const secretNumber = Math.floor(Math.random() * 10) + 1;
            const gameResult = processNumberGame(speechResult, secretNumber);
            responseData.patient_guess = gameResult.guess;
            responseData.game_result = gameResult.result;
            responseData.secret_number = secretNumber;

            // Generate feedback message for the game
            let gameFeedback = "";
            if (gameResult.result === "winner") {
                gameFeedback = `Nicely done! You correctly guessed the number was ${secretNumber}.`;
            } else {
                gameFeedback = `Good try! The number was ${secretNumber}.`;
            }
            responseData.gameFeedback = gameFeedback;
        },
        getPrompt: () => "Let's play a guessing game. I'm thinking of a number between 1 and 10. What's your guess?",
        urlPath: "number_game",
        speechModel: "numbers_and_commands",
        speechTimeout: 4,
        noInputActionPath: "closing",
    },

    [CallState.CLOSING]: {
        // No processResponse needed - logging happens in route.ts
        getPrompt: () => "Thank you. Have a wonderful day!",
        urlPath: "closing",
    },

    [CallState.ERROR]: {
        getPrompt: () => "Sorry, I didn't catch that. Let's continue.",
        urlPath: "closing", // Redirect to closing on error
    },

    [CallState.END]: {
        getPrompt: () => "Goodbye!",
        urlPath: "closing", // Should not be used, but included for completeness
    },
};

// Helper function to map state string to CallState enum
export function mapStateStringToEnum(stateString: string): CallState {
    const stateMap: Record<string, CallState> = {
        mood_check: CallState.MOOD_CHECK,
        schedule_check: CallState.SCHEDULE_CHECK,
        medication_reminder: CallState.MEDICATION_REMINDER,
        number_game: CallState.NUMBER_GAME,
        closing: CallState.CLOSING,
    };

    return stateMap[stateString] || CallState.ERROR;
}
