/**
 * Test-related type definitions
 * Centralized location for all mock interfaces and types used in testing
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================================================
// OpenAI Mock Types
// ============================================================================

export interface MockAudioResponse {
    arrayBuffer: () => Promise<Buffer>;
}

export interface MockChatCompletion {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ============================================================================
// Twilio Mock Types
// ============================================================================

export interface TwiMLNode {
    type: string;
    [key: string]: any;
}

export interface GatherNode extends TwiMLNode {
    type: "gather";
    options: any;
    children: TwiMLNode[];
    play: jest.Mock;
    say: jest.Mock;
}

export interface MockCall {
    sid: string;
    accountSid: string;
    to: string;
    from: string;
    status: string;
    dateCreated: Date;
    dateUpdated: Date;
    url?: string;
    statusCallback?: string;
}

export interface MockMessage {
    sid: string;
    body: string;
    status: string;
}

export interface MockTwilioClient {
    accountSid: string;
    authToken: string;
    calls: {
        create: jest.Mock<Promise<MockCall>>;
        list: jest.Mock<Promise<MockCall[]>>;
        get: (sid: string) => {
            fetch: jest.Mock<Promise<{ sid: string; status: string; duration: number }>>;
        };
    };
    messages: {
        create: jest.Mock<Promise<MockMessage>>;
    };
}

// ============================================================================
// Supabase Mock Types
// ============================================================================

export interface MockUser {
    id: string;
    email: string;
    created_at?: string;
}

export interface MockSession {
    access_token: string;
    refresh_token: string;
}

export interface MockAuthResponse {
    data: {
        user: MockUser | null;
        session: MockSession | null;
    };
    error: null | Error;
}

export interface MockQueryBuilder {
    select: jest.Mock<MockQueryBuilder>;
    insert: jest.Mock<MockQueryBuilder>;
    update: jest.Mock<MockQueryBuilder>;
    delete: jest.Mock<MockQueryBuilder>;
    eq: jest.Mock<MockQueryBuilder>;
    neq: jest.Mock<MockQueryBuilder>;
    gt: jest.Mock<MockQueryBuilder>;
    gte: jest.Mock<MockQueryBuilder>;
    lt: jest.Mock<MockQueryBuilder>;
    lte: jest.Mock<MockQueryBuilder>;
    like: jest.Mock<MockQueryBuilder>;
    ilike: jest.Mock<MockQueryBuilder>;
    is: jest.Mock<MockQueryBuilder>;
    in: jest.Mock<MockQueryBuilder>;
    order: jest.Mock<MockQueryBuilder>;
    limit: jest.Mock<MockQueryBuilder>;
    single: jest.Mock<Promise<{ data: any; error: null | Error }>>;
    maybeSingle: jest.Mock<Promise<{ data: any; error: null | Error }>>;
    then: jest.Mock<Promise<{ data: any[]; error: null | Error }>>;
}

export interface MockChannel {
    on: jest.Mock<MockChannel>;
    subscribe: jest.Mock<MockChannel>;
    unsubscribe: jest.Mock<MockChannel>;
}

export interface MockStorage {
    from: jest.Mock<{
        upload: jest.Mock<Promise<{ data: { path: string }; error: null | Error }>>;
        download: jest.Mock<Promise<{ data: Buffer; error: null | Error }>>;
        remove: jest.Mock<Promise<{ data: object; error: null | Error }>>;
        list: jest.Mock<Promise<{ data: any[]; error: null | Error }>>;
    }>;
}

export interface MockSupabaseClient {
    auth: {
        getUser: jest.Mock<Promise<{ data: { user: MockUser | null }; error: null | Error }>>;
        signOut: jest.Mock<Promise<{ error: null | Error }>>;
        signInWithOtp: jest.Mock<Promise<MockAuthResponse>>;
        verifyOtp: jest.Mock<Promise<MockAuthResponse>>;
        getSession: jest.Mock<Promise<{ data: { session: MockSession | null }; error: null | Error }>>;
    };
    from: jest.Mock<MockQueryBuilder>;
    channel: jest.Mock<MockChannel>;
    removeChannel: jest.Mock;
    storage: MockStorage;
}
