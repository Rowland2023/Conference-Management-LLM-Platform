module.exports = {
  testEnvironment: 'node',

  setupFilesAfterEnv: ['<rootDir>/test/setup/jest.setup.js'],

  transform: {},

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  collectCoverageFrom: ['src/**/*.js'],

  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },

  testMatch: ['**/test/**/*.test.js'],

  verbose: true
};