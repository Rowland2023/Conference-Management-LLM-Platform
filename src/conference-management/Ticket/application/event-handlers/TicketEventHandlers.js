// src/modules/ticket/interfaces/events/TicketEventHandler.js
import { DomainError } from '../../../shared/errors/index.js';

export class TicketEventHandler {
  #ticketCommandService;
  #logger;

  constructor({ ticketCommandService, logger }) {
    this.#ticketCommandService = ticketCommandService;
    this.#logger = logger;
  }

  /**
   * Router for incoming messaging broker events
   */
  async handle(eventEnvelope) {
    const { eventName, metadata, payload } = eventEnvelope;
    const correlationId = metadata?.correlationId;
    const messageId = metadata?.messageId; // Unique broker message ID used for event deduplication

    const log = this.#logger.child({ eventName, correlationId, messageId });
    log.info('Received domain event from broker. Routing to application layer.');

    try {
      switch (eventName) {
        
        case 'payment.succeeded':
          // Convert reserved tickets into fully confirmed sales
          await this.#ticketCommandService.confirmTicketPurchase({
            ticketId: payload.ticketId,
            quantity: payload.quantity,
            paymentId: payload.paymentId,
            correlationId,
            idempotencyKey: `idemp-confirm-${payload.paymentId}`
          });
          break;

        case 'reservation.expired':
          // Release locked capacity back into the inventory pool
          await this.#ticketCommandService.releaseTicket({
            ticketId: payload.ticketId,
            quantity: payload.quantity,
            correlationId,
            idempotencyKey: `idemp-release-${payload.reservationId}`
          });
          break;

        default:
          log.debug({ eventName }, 'Unhandled domain event encountered. Skipping execution.');
          break;
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to process domain event successfully');
      
      // Determine if error is a system error (re-throw to trigger Broker DLQ/Retry) 
      // or a domain invariant violation (acknowledge message to prevent infinite poison pill cycles)
      if (error instanceof DomainError && error.status < 500) {
        log.warn({ errorCode: error.code }, 'Domain boundary validation failed. Message safely acknowledged.');
        return; // Acknowledge message, do not re-throw
      }

      throw error; // Re-throw to cause consumer nack / backoff retry
    }
  }
}