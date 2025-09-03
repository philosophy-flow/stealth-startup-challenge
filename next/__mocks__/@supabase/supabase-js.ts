/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { MockQueryBuilder, MockSupabaseClient } from "@/types/tests";

const createMockQueryBuilder = (): MockQueryBuilder => {
    const builder: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
            data: { id: "test-id", name: "test-name" },
            error: null,
        }),
        maybeSingle: jest.fn().mockResolvedValue({
            data: { id: "test-id", name: "test-name" },
            error: null,
        }),
        then: jest.fn((callback?: (result: any) => any) => {
            const result = {
                data: [{ id: "test-id", name: "test-name" }],
                error: null,
            };
            if (callback) {
                return Promise.resolve(callback(result));
            }
            return Promise.resolve(result);
        }),
    };

    // make methods return 'this' for chaining
    Object.keys(builder).forEach((key) => {
        if (key !== "single" && key !== "maybeSingle" && key !== "then") {
            builder[key].mockReturnValue(builder);
        }
    });

    return builder;
};

export const mockSupabaseClient: MockSupabaseClient = {
    auth: {
        getUser: jest.fn().mockResolvedValue({
            data: {
                user: {
                    id: "test-user-id",
                    email: "test@example.com",
                    created_at: "2024-01-01T00:00:00Z",
                },
            },
            error: null,
        }),
        signOut: jest.fn().mockResolvedValue({
            error: null,
        }),
        signInWithOtp: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null,
        }),
        verifyOtp: jest.fn().mockResolvedValue({
            data: {
                user: {
                    id: "test-user-id",
                    email: "test@example.com",
                },
                session: {
                    access_token: "test-access-token",
                    refresh_token: "test-refresh-token",
                },
            },
            error: null,
        }),
        getSession: jest.fn().mockResolvedValue({
            data: {
                session: {
                    access_token: "test-access-token",
                    refresh_token: "test-refresh-token",
                },
            },
            error: null,
        }),
    },
    from: jest.fn((_table: string) => createMockQueryBuilder()),
    channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn().mockReturnThis(),
    }),
    removeChannel: jest.fn(),
    storage: {
        from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({
                data: { path: "test-path" },
                error: null,
            }),
            download: jest.fn().mockResolvedValue({
                data: Buffer.from("test-data"),
                error: null,
            }),
            remove: jest.fn().mockResolvedValue({
                data: {},
                error: null,
            }),
            list: jest.fn().mockResolvedValue({
                data: [],
                error: null,
            }),
        }),
    },
};

export const createClient = jest.fn((): MockSupabaseClient => mockSupabaseClient);
