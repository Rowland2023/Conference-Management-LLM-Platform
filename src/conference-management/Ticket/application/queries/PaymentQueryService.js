// src/modules/payment/application/queries/PaymentQueryService.js
import { DomainError } from '../../../shared/errors/index.js';

export class PaymentQueryService {
  #dbConnection; // Direct database query engine connection (e.g., Knex / pg pool)
  #logger;

  constructor({ dbConnection, logger }) {
    this.#dbConnection = dbConnection;
    this.#logger = logger;
  }

  /**
   * Retrieves single payment details for customer-facing dashboards or API checks.
   */
  async getPaymentById(paymentId, correlationId) {
    const log = this.#logger.child({ correlationId, paymentId, operation: 'getPaymentById' });

    log.debug('Executing read query against database');
    const payment = await this.#dbConnection('payments')
      .select('id', 'order_id', 'amount', 'currency', 'status', 'transaction_reference', 'created_at')
      .where({ id: paymentId })
      .first();

    if (!payment) {
      throw new DomainError('PAYMENT_NOT_FOUND', `Payment with ID ${paymentId} could not be found`, 404);
    }

    // Format directly to external REST schema (bypassing Domain Entity hydration overhead)
    return {
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      status: payment.status,
      reference: payment.transaction_reference,
      processedAt: payment.created_at
    };
  }

  /**
   * Fetches paginated transaction history for financial audit panels
   */
  async getPaymentsByOrder(orderId, { limit = 10, offset = 0 } = {}) {
    const payments = await this.#dbConnection('payments')
      .select('id', 'amount', 'currency', 'status', 'created_at')
      .where({ order_id: orderId })
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    return payments.map(p => ({
      paymentId: p.id,
      amount: parseFloat(p.amount),
      currency: p.currency,
      status: p.status,
      timestamp: p.created_at
    }));
  }
}