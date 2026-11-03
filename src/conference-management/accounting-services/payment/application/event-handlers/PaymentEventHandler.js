// src/modules/payment/application/event-handlers/PaymentEventHandler.js
import { DomainError } from '../../../shared/errors/index.js';

export class PaymentEventHandler {
  #paymentCommandService;
  #paymentQueryService;
  #logger;

  constructor({ paymentCommandService, paymentQueryService, logger }) {
    this.#paymentCommandService = paymentCommandService;
    this.#paymentQueryService = paymentQueryService;
    this.#logger = logger;
  }

  /**
   * Routes domain events to payment commands.
   * NOTE: We do NOT auto-charge on ticket.reserved. User must explicitly pay.
   */
  async handle(eventEnvelope) {
    const { eventName, metadata, payload } = eventEnvelope;
    const correlationId = metadata?.correlationId;
    const messageId = metadata?.messageId || metadata?.eventId;

    const log = this.#logger.child({ eventName, correlationId, messageId });
    log.info('Received domain event from broker');

    try {
      switch (eventName) {

        case 'ticket.cancelled':
          /**
           * Event cancelled → refund completed payments for this ticket type
           */
          log.info({ ticketId: payload.ticketId }, 'Initiating refunds for cancelled ticket');
          
          // 1. Fetch target payments (consider adding pagination or streaming for massive scale)
          const completedPayments = await this.#paymentQueryService.findCompletedByTicketId(
            payload.ticketId, 
            { correlationId }
          );

          if (!completedPayments || completedPayments.length === 0) {
            log.info({ ticketId: payload.ticketId }, 'No completed payments to refund');
            return;
          }

          log.info({ count: completedPayments.length }, `Processing ${completedPayments.length} refunds in chunks`);

          // 2. Batch chunking (concurrency control) to prevent overloading DB and downstream payment APIs
          const CONCURRENCY_LIMIT = 5; 
          for (let i = 0; i < completedPayments.length; i += CONCURRENCY_LIMIT) {
            const chunk = completedPayments.slice(i, i + CONCURRENCY_LIMIT);
            
            // Settle all refunds in this chunk concurrently
            await Promise.allSettled(
              chunk.map(async (payment) => {
                try {
                  await this.#paymentCommandService.processRefund({
                    paymentId: payment.id,
                    amount: payment.amount,
                    reason: `Event Cancelled: ${payload.reason || 'No reason provided'}`,
                    correlationId,
                    idempotencyKey: `refund-${payment.id}-${messageId}`
                  });
                } catch (refundError) {
                  // CRITICAL: We catch errors *inside* the map. 
                  // If payment #3 fails, payment #4 & #5 must still be attempted.
                  log.error({ 
                    err: refundError, 
                    paymentId: payment.id 
                  }, 'Single transaction refund failed during bulk event cancellation process');
                }
              })
            );
          }
          break;

        case 'reservation.expired':
          log.debug('Reservation expired - no payment action needed');
          break;

        default:
          log.debug({ eventName }, 'No payment triggers for event');
          break;
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to execute payment workflow');

      if (error instanceof DomainError && error.status < 500) {
        log.warn({ errorCode: error.code }, 'Domain error - acknowledging message');
        return;
      }

      throw error; // Let database connection or underlying server issues trigger retry
    }
  }
}