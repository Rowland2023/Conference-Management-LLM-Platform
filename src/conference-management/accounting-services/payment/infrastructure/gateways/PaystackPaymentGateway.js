
import axios from "axios";

export class PaystackPaymentGateway {
    constructor(secretKey, { timeout = 15000, logger = console } = {}) {
        if (!secretKey) {
            throw new Error("Paystack Secret Key required");
        }

        this.logger = logger;

        this.httpClient = axios.create({
            baseURL: "https://api.paystack.co",
            timeout,
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
        });
    }

    async initializeTransaction({
        email,
        amountInKobo,
        reference,
        bookingId,
        userId,
        currency = "NGN",
        callbackUrl,
    }) {
        if (!reference) {
            throw new Error("Reference required for idempotency");
        }

        if (!bookingId) {
            throw new Error("bookingId required for audit");
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Valid email required");
        }

        if (!Number.isSafeInteger(amountInKobo) || amountInKobo <= 0) {
            throw new Error("Amount must be a positive integer in kobo");
        }

        const payload = {
            email: email.trim().toLowerCase(),
            amount: amountInKobo,
            currency: currency.toUpperCase().trim(),
            reference: reference.trim(),
            callback_url: callbackUrl || undefined,
            metadata: {
                booking_id: bookingId,
                user_id: userId || "guest",
                env: process.env.NODE_ENV || "development",
            },
        };

        try {
            const { data } = await this.httpClient.post(
                "/transaction/initialize",
                payload
            );

            if (data?.status === true && data?.data?.reference) {
                return {
                    success: true,
                    authorizationUrl: data.data.authorization_url,
                    accessCode: data.data.access_code,
                    reference: data.data.reference,
                };
            }

            return {
                success: false,
                errorMessage: data?.message || "Initialization failed",
            };
        } catch (error) {
            const apiMessage = error.response?.data?.message;

            if (
                apiMessage?.toLowerCase().includes("reference already exists")
            ) {
                this.logger.warn(
                    { reference, bookingId },
                    "Duplicate reference: already initialized"
                );

                return {
                    success: false,
                    isDuplicate: true,
                    errorMessage: "Transaction already initialized.",
                };
            }

            this.logger.error(
                {
                    err: error.message,
                    data: error.response?.data,
                    bookingId,
                },
                "Paystack init failed"
            );

            return {
                success: false,
                errorMessage:
                    apiMessage || "Payment gateway error. Try again.",
            };
        }
    }

    async verifyTransaction(reference, { retries = 3 } = {}) {
        if (!reference) {
            throw new Error("Reference required");
        }

        for (let i = 0; i <= retries; i++) {
            try {
                const { data } = await this.httpClient.get(
                    `/transaction/verify/${encodeURIComponent(reference)}`
                );

                if (data?.status === true && data?.data?.status === "success") {
                    return {
                        success: true,
                        transactionId: String(data.data.id),
                        amountPaidInKobo: data.data.amount,
                        currency: data.data.currency,
                        metadata: data.data.metadata,
                        paidAt: data.data.paid_at,
                        channel: data.data.channel,
                    };
                }

                const status = data?.data?.status;

                if (
                    ["failed", "abandoned"].includes(status) ||
                    i === retries
                ) {
                    return {
                        success: false,
                        status,
                        errorMessage:
                            data?.data?.gateway_response ||
                            "Transaction failed",
                    };
                }

                await new Promise((resolve) =>
                    setTimeout(resolve, 2000 * Math.pow(2, i))
                );
            } catch (error) {
                if (i === retries) {
                    this.logger.error(
                        { err: error.message, reference },
                        "Verify failed after retries"
                    );

                    return {
                        success: false,
                        errorMessage:
                            "Unable to verify payment. Will retry via webhook.",
                    };
                }

                await new Promise((resolve) =>
                    setTimeout(resolve, 2000 * Math.pow(2, i))
                );
            }
        }

        return {
            success: false,
            errorMessage: "Transaction verification incomplete",
        };
    }

    async refund({
        externalReference,
        gatewayTransactionId,
        amount,
        currency = "NGN",
        idempotencyKey,
        metadata = {},
    }) {
        const transaction = gatewayTransactionId || externalReference;

        if (!transaction) {
            throw new Error(
                "Paystack transaction ID or reference required"
            );
        }

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            throw new Error("Refund amount must be a positive integer");
        }

        if (
            !idempotencyKey ||
            idempotencyKey.length < 8 ||
            idempotencyKey.length > 64
        ) {
            throw new Error(
                "Refund reference must contain between 8 and 64 characters"
            );
        }

        try {
            const { data } = await this.httpClient.post("/refund", {
                transaction,
                amount,
                currency: currency.toUpperCase(),
                reference: idempotencyKey,
                merchant_note: metadata.reason || "Payment refund",
                customer_note: metadata.customerNote || undefined,
            });

            if (data?.status !== true || !data?.data?.id) {
                throw new Error(
                    data?.message || "Paystack refund request failed"
                );
            }

            const providerStatus = String(
                data.data.status || "pending"
            ).toLowerCase();

            let status = "processing";

            if (providerStatus === "processed") {
                status = "succeeded";
            } else if (providerStatus === "failed") {
                status = "failed";
            }

            return {
                id: String(data.data.id),
                status,
                provider: "paystack",
                transactionReference: externalReference,
                amount: data.data.amount ?? amount,
                currency: data.data.currency || currency.toUpperCase(),
            };
        } catch (error) {
            this.logger.error(
                {
                    err: error.message,
                    response: error.response?.data,
                    transaction,
                    idempotencyKey,
                },
                "Paystack refund failed"
            );

            throw error;
        }
    }
}
