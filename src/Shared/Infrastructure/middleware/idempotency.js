// src/shared/infrastructure/middleware/idempotency.js

export function idempotency(options = {}) {
  const {
    header = "Idempotency-Key",
    required = true
  } = options;

  return (req, res, next) => {
    const key = req.get(header);

    if (required && !key) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: `${header} header is required.`
        }
      });
    }

    req.idempotencyKey = key || null;

    next();
  };
}