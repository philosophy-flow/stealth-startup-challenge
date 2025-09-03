/**
 * Example test demonstrating TypeScript mock usage
 * This file shows how to properly use the TypeScript mocks in tests
 */

import OpenAI from "openai";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

// Mmcks are automatically loaded from __mocks__/ directory
jest.mock("openai");
jest.mock("twilio");
jest.mock("@supabase/supabase-js");

describe("TypeScript Mock Examples", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("OpenAI Mock", () => {
        it("should mock TTS generation with TypeScript", async () => {
            const client = new OpenAI({ apiKey: "test-key" });

            // The mock is fully typed
            const response = await client.audio.speech.create({
                model: "tts-1",
                voice: "nova",
                input: "Hello world",
                speed: 0.9,
            });

            const buffer = await response.arrayBuffer();
            expect(buffer).toBeInstanceOf(Buffer);
            expect(client.audio.speech.create).toHaveBeenCalledTimes(1);
        });

        it("should mock chat completions with TypeScript", async () => {
            const client = new OpenAI({ apiKey: "test-key" });

            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: "Test" }],
            });

            expect(completion.choices[0].message.content).toContain("Mock summary");
            expect(completion.usage?.total_tokens).toBe(150);
        });
    });

    describe("Twilio Mock", () => {
        it("should mock call creation with TypeScript", async () => {
            const client = twilio("test-sid", "test-token");

            const call = await client.calls.create({
                to: "+15551234567",
                from: "+15559876543",
                url: "https://example.com/webhook",
            });

            expect(call.sid).toBe("CAtest123456789");
            expect(call.status).toBe("queued");
            expect(client.calls.create).toHaveBeenCalledTimes(1);
        });

        it("should mock TwiML responses with TypeScript", () => {
            const response = new twilio.twiml.VoiceResponse();
            response.say({ voice: "alice", language: "en-US" }, "Hello");
            response.hangup();

            expect(response.toString()).toContain("mock-twiml");
            expect(response.children).toHaveLength(2);
        });

        it("should validate webhook signatures with TypeScript", () => {
            const isValid = twilio.validateRequest("test-token", "valid-signature", "https://example.com", {});

            expect(isValid).toBe(true);
            expect(twilio.validateRequest).toHaveBeenCalledTimes(1);
        });
    });

    describe("Supabase Mock", () => {
        it("should mock authentication with TypeScript", async () => {
            const client = createClient("test-url", "test-key");

            const { data, error } = await client.auth.getUser();

            expect(error).toBeNull();
            expect(data.user?.email).toBe("test@example.com");
            expect(client.auth.getUser).toHaveBeenCalledTimes(1);
        });

        it("should mock database queries with TypeScript", async () => {
            const client = createClient("test-url", "test-key");

            const query = client.from("patients").select("*").eq("id", "test-id");

            const { data, error } = await query;

            expect(error).toBeNull();
            expect(data).toEqual([{ id: "test-id", name: "test-name" }]);
            expect(client.from).toHaveBeenCalledWith("patients");
        });

        it("should support method chaining with TypeScript", async () => {
            const client = createClient("test-url", "test-key");

            const { data } = await client
                .from("calls")
                .select("*")
                .eq("patient_id", "123")
                .order("created_at", { ascending: false })
                .limit(10);

            expect(data).toBeDefined();
            expect(data).toHaveLength(1);
        });
    });
});
