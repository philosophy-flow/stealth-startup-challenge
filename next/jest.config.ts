import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
    dir: "./",
});

const config: Config = {
    coverageProvider: "v8",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    collectCoverageFrom: [
        "src/**/*.{js,jsx,ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/types/**",
        "!src/app/**/*.tsx", // Exclude Next.js pages/layouts for now
        "!src/components/**/*.tsx", // Exclude UI components for now
    ],
    moduleDirectories: ["node_modules", "<rootDir>/"],
    testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
    transformIgnorePatterns: ["node_modules/(?!(openai|twilio|@supabase)/)"],
    globals: {
        "ts-jest": {
            tsconfig: {
                jsx: "react",
            },
        },
    },
};

export default createJestConfig(config);
