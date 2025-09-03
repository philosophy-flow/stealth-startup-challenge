/* eslint-disable @typescript-eslint/no-unused-vars */

import "@testing-library/jest-dom";

// mock console methods to reduce noise in tests
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
} as Console;

// mock next.js router
jest.mock("next/navigation", () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
            pathname: "/",
            query: {},
            asPath: "/",
        };
    },
    usePathname() {
        return "/";
    },
    useSearchParams() {
        return new URLSearchParams();
    },
}));

// mock next.js headers
jest.mock("next/headers", () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
        getAll: jest.fn(() => []),
        set: jest.fn(),
        delete: jest.fn(),
    })),
    headers: jest.fn(() => new Headers()),
}));

// setup fetch mock for tests
global.fetch = jest.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "",
    } as Response)
) as jest.MockedFunction<typeof fetch>;

// clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
