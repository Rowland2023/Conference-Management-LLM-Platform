module.exports = {
    testEnvironment: "node",
    transform: {},
    setupFilesAfterEnv: ["<rootDir>/test/setup/jest.setup.js"],

    collectCoverageFrom: [
        "src/**/*.js",
        "!src/index.js",
    ],

    coverageThreshold: {
        global: {
            statements: 70,
            branches: 70,
            functions: 70,
            lines: 70,
        },
    },

    testMatch: [
        "**/test/api/**/*.test.js",
        "**/test/integration/**/*.test.js",
    ],

    testPathIgnorePatterns: [
        "<rootDir>/node_modules/",
        "<rootDir>/Conference-Management-LLM-Platform/",
    ],

    verbose: false,
};