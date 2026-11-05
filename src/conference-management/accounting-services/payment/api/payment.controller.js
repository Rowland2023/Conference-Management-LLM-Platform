// src/conference-management/accounting-services/payment/api/payment.controller.js

import PaymentSerializer from "../serializers/payment.serializer.js";


export class PaymentController {


    constructor({

        paymentService,

    }) {

        this.paymentService =
            paymentService;

    }



    /**
     * POST /payments
     */
    createPayment = async (req, res, next) => {

        try {


            const payment =
                await this.paymentService.createPayment({

                    ...req.body,

                    tenantId: req.actor.tenantId,

                    actor: req.actor,

                    correlationId: req.correlationId,

                    idempotencyKey: req.idempotencyKey,

                });



            return res.status(201).json({

                success: true,

                data: PaymentSerializer.serialize(payment),

            });


        } catch(err) {

            next(err);

        }

    };





    /**
     * GET /payments/:id
     */
    getPaymentById = async (req, res, next) => {

        try {


            const payment =
                await this.paymentService.getPaymentById({

                    id: req.params.id,

                    tenantId: req.actor.tenantId,

                });



            return res.status(200).json({

                success: true,

                data: PaymentSerializer.serialize(payment),

            });


        } catch(err) {

            next(err);

        }

    };





    /**
     * GET /payments
     */
    getAllPayments = async (req, res, next) => {

        try {


            const payments =
                await this.paymentService.getAllPayments({

                    tenantId: req.actor.tenantId,

                    filters: req.query,

                });



            return res.status(200).json({

                success: true,

                data: payments.map(
                    PaymentSerializer.serialize
                ),

            });


        } catch(err) {

            next(err);

        }

    };





    /**
     * POST /payments/:id/refund
     */
    refundPayment = async (req, res, next) => {

        try {


            const refund =
                await this.paymentService.refundPayment({

                    paymentId: req.params.id,

                    tenantId: req.actor.tenantId,

                    actor: req.actor,

                    amountMinor: req.body.amount,

                    reason: req.body?.reason,

                    idempotencyKey: req.idempotencyKey,

                    correlationId: req.correlationId,

                });



            return res.status(200).json({

                success: true,

                data: {
                      paymentId: refund.paymentId,
                      refundId: refund.refundId,
                      gatewayRefundId: refund.gatewayRefundId,
                      status: refund.status,
                      amountRefunded: refund.amountRefunded,
                      },

            });


        } catch(err) {

            next(err);

        }

    };


}