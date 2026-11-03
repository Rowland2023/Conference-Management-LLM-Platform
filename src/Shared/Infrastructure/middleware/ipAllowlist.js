// src/shared/infrastructure/middleware/ipAllowlist.js

import ipRangeCheck from "ip-range-check";

/**
 * Restrict access to a list of trusted IPs or CIDR ranges.
 */
export function ipAllowlist(allowedRanges = []) {
  return (req, res, next) => {
    const clientIp =
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress;

    if (!ipRangeCheck(clientIp, allowedRanges)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "IP_NOT_ALLOWED",
          message: "Access denied from this IP address."
        }
      });
    }

    next();
  };
}