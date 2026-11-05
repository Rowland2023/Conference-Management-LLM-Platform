
module.exports = {
    testEnvironment: "node",
    transform: {},

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

    verbose: false,
};
