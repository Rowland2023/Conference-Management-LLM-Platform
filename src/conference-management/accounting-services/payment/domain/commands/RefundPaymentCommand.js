// src/conference-management/accounting-services/payment/domain/commands/RefundPaymentCommand.js

export class RefundPaymentCommand {
  /**
   * @param {Object} params
   * @param {string} params.paymentId
   * @param {number} [params.amountMinor]
   * @param {string} params.reason
   * @param {string} params.tenantId
   * @param {string} params.idempotencyKey
   * @param {string} [params.correlationId]
   * @param {Object} [params.actor]
   */
  constructor({
    paymentId,
    amountMinor,
    reason,
    tenantId,
    idempotencyKey,
    correlationId = null,
    actor = null,
  }) {
    if (!paymentId) {
      throw new Error("RefundPaymentCommand: paymentId is required.");
    }

    if (!tenantId) {
      throw new Error("RefundPaymentCommand: tenantId is required.");
    }

    if (
      amountMinor !== undefined &&
      (!Number.isSafeInteger(amountMinor) || amountMinor < 100)
    ) {
      throw new Error(
        "RefundPaymentCommand: amountMinor must be an integer of at least 100 minor units when provided."
      );
    }

    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error("RefundPaymentCommand: reason is required.");
    }

    const normalizedKey =
      typeof idempotencyKey === "string"
        ? idempotencyKey.trim()
        : "";

    if (
      normalizedKey.length < 16 ||
      normalizedKey.length > 255 ||
      !/^[A-Za-z0-9_-]+$/.test(normalizedKey)
    ) {
      throw new Error(
        "RefundPaymentCommand: idempotencyKey must contain 16-255 alphanumeric, hyphen, or underscore characters."
      );
    }

    this.paymentId = paymentId;
    this.amountMinor = amountMinor;
    this.reason = reason.trim();
    this.tenantId = tenantId;
    this.idempotencyKey = normalizedKey;
    this.correlationId = correlationId;
    this.actor = actor;

    Object.freeze(this);
  }
}