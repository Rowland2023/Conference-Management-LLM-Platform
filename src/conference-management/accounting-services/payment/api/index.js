// src/modules/Payment/api/index.js

import { PaymentController } from './payment.controller.js';
import { PaymentWebhookController } from './paymentWebhook.controller.js';
import { getPaymentRoutes } from './payment.route.js';
// Adjust the relative traversal depth from payment.route.js up to src/shared/infrastructure/middleware/authGuard.js
// From src/conference-management/accounting_services/Payment/api/
// Go up 5 levels: api -> Payment -> accounting_services -> conference-management -> src
/**
 * Initializes and composes the Payment API HTTP layer.
 * Expects the underlying Application Use Cases to be injected.
 * 
 * @param {Object} useCases - The application use cases from the core layer
 * @returns {Array} List of configured route objects for Express/Fastify adapter
 */
export const initializePaymentApi = ({
    createPaymentUseCase,
    getPaymentByIdUseCase,
    getAllPaymentsUseCase,
    refundPaymentUseCase,
    handleWebhookUseCase
}) => {
    // 1. Instantiate HTTP controllers with their required Use Cases
    const paymentController = new PaymentController({
        createPaymentUseCase,
        getPaymentByIdUseCase,
        getAllPaymentsUseCase,
        refundPaymentUseCase
    });

    const paymentWebhookController = new PaymentWebhookController({
        handleWebhookUseCase
    });

    // 2. Pass controllers into the routing configuration map
    const routes = getPaymentRoutes(paymentController, paymentWebhookController);

    // 3. Return the fully wire-up route configurations
    return routes;
};