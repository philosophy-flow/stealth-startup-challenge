import OpenAI from "openai";

// Initialize OpenAI client
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

// Cost tracking for monitoring
const COSTS = {
    TTS_PER_1K_CHARS: 0.015, // tts-1 model cost
    GPT_MINI_INPUT_PER_1M: 0.15, // gpt-4o-mini input cost
    GPT_MINI_OUTPUT_PER_1M: 0.6, // gpt-4o-mini output cost
};

// Track API usage for cost monitoring
export function calculateTTSCost(text: string): number {
    const charCount = text.length;
    return (charCount / 1000) * COSTS.TTS_PER_1K_CHARS;
}

// Log cost for monitoring (in production, send to analytics)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logCost(service: string, cost: number, details?: any): void {
    console.log(`[COST] ${service}: $${cost.toFixed(4)}`, details);
}
