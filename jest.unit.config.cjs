module.exports = {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  collectCoverageFrom: [
    '[STRIPPED 78 bytes]/*.js',
    '[STRIPPED 98 bytes].aggregate.js',
    '[STRIPPED 97 bytes].entity.js',
    '[STRIPPED 67 bytes]*.js',
    '[STRIPPED 79 bytes].vo.js',
    '[STRIPPED 88 bytes].usecase.js',
    '[STRIPPED 85 bytes].usecase.js',
    '[STRIPPED 92 bytes].usecase.js',
    '[STRIPPED 89 bytes].mapper.js',
    '[STRIPPED 103 bytes].repository.js',
    '[STRIPPED 92 bytes].js',
    '[STRIPPED 94 bytes].js',
    '[STRIPPED 88 bytes].js',
    '[STRIPPED 72 bytes].js',
      'src/conference-management/accounting-services/payment/application/use-cases/create-payment.usecase.js',
    'src/conference-management/event-schedule/domain/entities/event.js',
    '[STRIPPED 71 bytes].service.js',
    '[STRIPPED 67 bytes].js',
    'src/Shared/Infrastructure/ai/AssistantService.js',
    'src/Shared/Infrastructure/ai/ToolRegistry.js',
    'src/Shared/Infrastructure/ai/errors.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'eslint.config.js',
    'src/vo/',
    'ApplicationErrors',
    'DomainErrors',
    'AggregateRoot',
    'DomainEvent',
    'Entity'
  ],
  coverageThreshold: {
    global: { statements: 70, branches: 70, functions: 70, lines: 70 }
  },
  testMatch: ['**/test/unit/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/Conference-Management-LLM-Platform/'
  ],
  verbose: false
};