// src/modules/notification/application/event-handlers/NotificationEventHandler.js
import { DomainError } from '../../../shared/errors/index.js';

export class NotificationEventHandler {
  #notificationCommandService;
  #logger;

  constructor({ notificationCommandService, logger }) {
    this.#notificationCommandService = notificationCommandService;
    this.#logger = logger;
  }

  /**
   * Routes domain events to notification commands.
   * Idempotent: uses messageId + event-specific keys to prevent duplicate sends.
   */
  async handle(eventEnvelope) {
    const { eventName, metadata, payload } = eventEnvelope;
    const correlationId = metadata?.correlationId;
    const messageId = metadata?.messageId || metadata?.eventId;

    const log = this.#logger.child({ eventName, correlationId, messageId });
    log.info('Routing domain event to notification service');

    try {
      switch (eventName) {
        case 'ticket.reserved':
          await this.#notificationCommandService.sendEmail({
            recipientId: payload.userId, // ← Ensure Ticket entity includes userId
            templateName: 'TICKET_RESERVATION_CONFIRMATION',
            templateData: {
              ticketId: payload.ticketId,
              quantity: payload.quantity,
              expiresAt: payload.expiresAt,
              availableAfter: payload.availableAfter
            },
            correlationId,
            idempotencyKey: `notif-reserve-${messageId}`
          });
          break;

        case 'ticket.purchased':
          await this.#notificationCommandService.sendEmail({
            recipientId: payload.userId, // ← Ensure Payment entity includes userId
            templateName: 'TICKET_PURCHASE_RECEIPT',
            templateData: {
              ticketId: payload.ticketId,
              quantity: payload.quantity,
              paymentId: payload.paymentId,
              revenue: payload.revenue
            },
            correlationId,
            idempotencyKey: `notif-purchase-${payload.paymentId}`
          });
          break;

        case 'payment.failed':
          await this.#notificationCommandService.sendSMS({
            recipientId: payload.userId,
            message: `Your payment for order ${payload.orderId} failed. Please update your payment method.`,
            correlationId,
            idempotencyKey: `notif-failed-${payload.paymentId}`
          });
          break;

        case 'ticket.cancelled':
          await this.#notificationCommandService.sendEmail({
            recipientId: payload.userId,
            templateName: 'EVENT_CANCELLATION_REFUND',
            templateData: {
              ticketId: payload.ticketId,
              reason: payload.reason,
              refundableCount: payload.refundableCount
            },
            correlationId,
            idempotencyKey: `notif-cancel-${payload.ticketId}-${messageId}`
          });
          break;

        default:
          log.debug({ eventName }, 'No notification triggers for event');
          break;
      }
    } catch (error) {
      log.error({ err: error }, 'Notification dispatch failed');

      // Ack poison pills, retry transient failures
      if (error instanceof DomainError && error.status < 500) {
        log.warn({ errorCode: error.code }, 'Domain error - acknowledging message');
        return;
      }

      throw error; // Nack for broker retry
    }
  }
}