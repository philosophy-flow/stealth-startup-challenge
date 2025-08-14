/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MockAudioResponse, MockChatCompletion } from "@/types/tests";

class MockOpenAI {
    public apiKey?: string;
    public audio: {
        speech: {
            create: jest.Mock<Promise<MockAudioResponse>>;
        };
    };
    public chat: {
        completions: {
            create: jest.Mock<Promise<MockChatCompletion>>;
        };
    };

    constructor(config?: { apiKey?: string }) {
        this.apiKey = config?.apiKey;

        this.audio = {
            speech: {
                create: jest.fn().mockImplementation(async () => {
                    const mockAudioBuffer = Buffer.from("mock-audio-data");
                    return {
                        arrayBuffer: async () => mockAudioBuffer,
                    };
                }),
            },
        };

        this.chat = {
            completions: {
                create: jest.fn().mockImplementation(async (params: any) => {
                    return {
                        id: "mock-completion-id",
                        object: "chat.completion",
                        created: Date.now(),
                        model: params.model || "gpt-4o-mini",
                        choices: [
                            {
                                index: 0,
                                message: {
                                    role: "assistant",
                                    content: JSON.stringify({
                                        summary: "Mock summary of the call",
                                        mood: "positive",
                                    }),
                                },
                                finish_reason: "stop",
                            },
                        ],
                        usage: {
                            prompt_tokens: 100,
                            completion_tokens: 50,
                            total_tokens: 150,
                        },
                    };
                }),
            },
        };
    }
}

export default MockOpenAI;
