/**
 * @file src/shared/presentation/middleware/auth.middleware.js
 * 
 * JWT Authentication Middleware for User & Client-Facing API Endpoints.
 */
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        type: 'UnauthorizedError',
        message: 'Missing or malformed Bearer authorization token.',
      },
    });
  }

  const token = auth.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('[CRITICAL] JWT_SECRET is not configured in the environment.');
    return res.status(500).json({
      success: false,
      error: {
        type: 'InternalServerError',
        message: 'Authentication service misconfigured.',
      },
    });
  }

  try {
    // Pin allowed algorithms to prevent token header manipulation attacks
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Explicitly declare algorithm (or 'RS256' if using RSA public key)
      issuer: process.env.JWT_ISSUER || 'ledger-auth-service',
    });

    if (!payload.sub || !payload.tenantId) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'UnauthorizedError',
          message: 'Token payload missing required financial identity claims (sub, tenantId).',
        },
      });
    }

    // Attach immutable actor identity for downstream domain services & audit metadata
    req.actor = {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role || 'USER',
      permissions: payload.permissions || [],
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'UNKNOWN',
      authenticatedAt: new Date().toISOString(),
    };

    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Authentication token has expired.' 
      : 'Invalid or tampered authorization token.';

    return res.status(401).json({
      success: false,
      error: {
        type: 'UnauthorizedError',
        message,
      },
    });
  }
}

module.exports = authMiddleware;