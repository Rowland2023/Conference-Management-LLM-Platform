import { jest } from "@jest/globals";

jest.setTimeout(30000);

process.env.NODE_ENV = "test";
process.env.PORT = "4000";

// Test database: local Docker PostgreSQL.
// Preserve values supplied externally by CI or the test runner.
process.env.DB_HOST ??= "127.0.0.1";
process.env.DB_PORT ??= "5434";
process.env.DB_USER ??= "conference";
process.env.DB_PASSWORD ??= "conference_password";
process.env.DB_NAME ??= "conference_management";

// Test-only JWT configuration
process.env.JWT_SECRET = "conference-management-test-secret-only";
process.env.JWT_ISSUER = "conference-management-test";
process.env.JWT_AUDIENCE = "conference-management-test";