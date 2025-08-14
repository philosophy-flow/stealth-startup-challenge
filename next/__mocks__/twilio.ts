/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { TwiMLNode, GatherNode, MockTwilioClient } from "@/types/tests";

export class RestException extends Error {
    public code: number;
    public status: number;

    constructor(message: string, code: number, status: number) {
        super(message);
        this.name = "RestException";
        this.code = code;
        this.status = status;
    }
}

class VoiceResponse {
    public children: TwiMLNode[] = [];

    gather(options: any): GatherNode {
        const gather: GatherNode = {
            type: "gather",
            options,
            children: [],
            play: jest.fn((url: string) => {
                gather.children.push({ type: "play", url });
            }),
            say: jest.fn((attrs: any, text?: string) => {
                if (typeof attrs === "string") {
                    gather.children.push({ type: "say", text: attrs });
                } else {
                    gather.children.push({ type: "say", attrs, text });
                }
            }),
        };
        this.children.push(gather);
        return gather;
    }

    say(attrs: any, text?: string): void {
        if (typeof attrs === "string") {
            this.children.push({ type: "say", text: attrs });
        } else {
            this.children.push({ type: "say", attrs, text });
        }
    }

    play(url: string): void {
        this.children.push({ type: "play", url });
    }

    redirect(url: string): void {
        this.children.push({ type: "redirect", url });
    }

    hangup(): void {
        this.children.push({ type: "hangup" });
    }

    toString(): string {
        return '<?xml version="1.0" encoding="UTF-8"?><Response>mock-twiml</Response>';
    }
}

const mockTwilioClient = jest.fn(
    (accountSid: string, authToken: string): MockTwilioClient => ({
        accountSid,
        authToken,
        calls: {
            create: jest.fn().mockImplementation(async (params: any) => {
                // Simulate various scenarios based on test needs
                if (params.to === "+1invalid") {
                    const error = new RestException("Invalid phone number", 21211, 400);
                    throw error;
                }
                if (params.to === "+1authfail") {
                    const error = new RestException("Invalid credentials", 20003, 401);
                    throw error;
                }

                // Mock successful call creation
                return {
                    sid: "CAtest123456789",
                    accountSid: accountSid,
                    to: params.to,
                    from: params.from,
                    status: "queued",
                    dateCreated: new Date(),
                    dateUpdated: new Date(),
                    url: params.url,
                    statusCallback: params.statusCallback,
                };
            }),
            list: jest.fn().mockResolvedValue([]),
            get: jest.fn((sid: string) => ({
                fetch: jest.fn().mockResolvedValue({
                    sid,
                    status: "completed",
                    duration: 60,
                }),
            })),
        },
        messages: {
            create: jest.fn().mockResolvedValue({
                sid: "SMtest123456789",
                body: "Test message",
                status: "sent",
            }),
        },
    })
) as any;

mockTwilioClient.validateRequest = jest.fn(
    (authToken: string, signature: string | null, url: string, params: Record<string, string>): boolean => {
        if (signature === "invalid-signature") {
            return false;
        }
        return true;
    }
);

mockTwilioClient.twiml = {
    VoiceResponse,
};

export default mockTwilioClient;
