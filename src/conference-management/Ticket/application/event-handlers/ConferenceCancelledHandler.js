// src/modules/ticket/application/event-handlers/ConferenceCancelledHandler.js
import { DomainError } from '../../../shared/errors/index.js';

export class ConferenceCancelledHandler {
  #cancelTicketsByConferenceUseCase; // <-- USE BATCH USE CASE
  #logger;

  constructor({ cancelTicketsByConferenceUseCase, logger }) {
    this.#cancelTicketsByConferenceUseCase = cancelTicketsByConferenceUseCase;
    this.#logger = logger;
  }

  /**
   * Handles 'conference.cancelled' event by cancelling all associated tickets.
   * Executes in single transaction to prevent partial cancellation.
   */
  async handle(event) {
    const { conferenceId, reason } = event.payload;
    const { correlationId } = event;

    const log = this.#logger.child({ conferenceId, correlationId, event: 'conference.cancelled' });
    log.info('Processing conference cancellation - cancelling all tickets');

    try {
      const result = await this.#cancelTicketsByConferenceUseCase.execute({
        conferenceId,
        reason: `Conference Cancelled: ${reason}`,
        correlationId
      });

      log.info(
        { count: result.cancelledCount }, 
        `Successfully cancelled ${result.cancelledCount} ticket types`
      );

    } catch (error) {
      log.error(
        { err: error, conferenceId }, 
        'FATAL: Failed to cancel tickets for conference'
      );
      
      // Bubble up for broker retry/DLQ
      throw error;
    }
  }
}