/**
 * Setup verification test
 * This test verifies that the Jest testing infrastructure is properly configured
 */

import OpenAI from "openai";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

jest.mock("openai");
jest.mock("twilio");
jest.mock("@supabase/supabase-js");

describe("Testing Infrastructure", () => {
    it("should have test environment variables configured", () => {
        expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
        expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
        expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe("test-service-role-key");
        expect(process.env.TWILIO_ACCOUNT_SID).toBe("ACtest123456789");
        expect(process.env.TWILIO_AUTH_TOKEN).toBe("test-auth-token");
        expect(process.env.TWILIO_PHONE_NUMBER).toBe("+15551234567");
        expect(process.env.OPENAI_API_KEY).toBe("test-openai-key");
        expect(process.env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
        expect(process.env.NODE_ENV).toBe("test");
    });

    it("should have mocked console methods", () => {
        expect(console.log).toBeDefined();
        expect(console.error).toBeDefined();
        expect(console.warn).toBeDefined();
        expect(jest.isMockFunction(console.log)).toBe(true);
        expect(jest.isMockFunction(console.error)).toBe(true);
        expect(jest.isMockFunction(console.warn)).toBe(true);
    });

    it("should have mocked fetch", () => {
        expect(global.fetch).toBeDefined();
        expect(jest.isMockFunction(global.fetch)).toBe(true);
    });

    it("should be able to import and mock OpenAI", () => {
        const client = new OpenAI({ apiKey: "test-key" });

        expect(client).toBeDefined();
        expect(client.audio.speech.create).toBeDefined();
        expect(client.chat.completions.create).toBeDefined();
    });

    it("should be able to import and mock Twilio", () => {
        const client = twilio("test-sid", "test-token");

        expect(client).toBeDefined();
        expect(client.calls.create).toBeDefined();
        expect(twilio.validateRequest).toBeDefined();
    });

    it("should be able to import and mock Supabase", () => {
        const client = createClient("test-url", "test-key");

        expect(client).toBeDefined();
        expect(client.auth.getUser).toBeDefined();
        expect(client.from).toBeDefined();
    });
});
