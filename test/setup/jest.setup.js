import { jest } from "@jest/globals";
jest.setTimeout(30000);

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
/* Test-only JWT configuration */
process.env.JWT_SECRET = "conference-management-test-secret-only";
process.env.JWT_ISSUER = "conference-management-test";
process.env.JWT_AUDIENCE = "conference-management-test";
