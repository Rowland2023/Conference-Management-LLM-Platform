
import crypto from "node:crypto";

/**
 * Assigns or propagates a valid UUID correlation ID.
 *
 * Priority:
 * 1. Valid X-Correlation-Id UUID
 * 2. Valid X-Request-Id UUID
 * 3. Generate a new UUID
 */
export function correlationIdMiddleware(req, res, next) {
    const correlationHeader =
        req.headers["x-correlation-id"];

    const requestHeader =
        req.headers["x-request-id"];

    const candidate =
        typeof correlationHeader === "string"
            ? correlationHeader
            : typeof requestHeader === "string"
                ? requestHeader
                : null;

    const correlationId =
        candidate && crypto.randomUUID
            ? (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
                    ? candidate
                    : crypto.randomUUID()
            )
            : crypto.randomUUID();

    req.correlationId = correlationId;

    res.locals.correlationId = correlationId;

    res.setHeader("X-Correlation-Id", correlationId);

    next();
}
