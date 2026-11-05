import { jest } from "@jest/globals";
import { CreatePaymentUseCase } from "../../src/conference-management/accounting-services/payment/application/use-cases/create-payment.usecase.js";
import { Payment } from "../../src/conference-management/accounting-services/payment/domain/entities/Payment.js";

const input = {
    tenantId: "tenant-1",
    contextId: "order-1",
    bookingId: "booking-1",
    contextType: "ORDER",
    idempotencyKey: "idem-1",
    amount: 150000,
    currency: "NGN",
    email: "customer@example.com",
    gateway: "paystack",
    userId: "user-1",
};

const context = { correlationId: "corr-1" };
const trx = {};

function makePayment() {
    const payment = Payment.create(
        {
            id: "existing-payment",
            ...input,
            createdAt: new Date("2026-11-05T10:00:00.000Z"),
        },
        context,
    );

    payment.markGatewayInitialized(
        {
            externalReference: "gateway-ref-existing",
            checkoutUrl: "https://checkout.example/existing",
        },
        context,
    );

    return payment;
}

function makeDependencies(overrides = {}) {
    const logger = {
        child: jest.fn(() => logger),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };

    const gateway = {
        initializeTransaction: jest.fn().mockResolvedValue({
            reference: "gateway-ref-123",
            checkoutUrl: "https://checkout.example/123",
        }),
    };

    const dependencies = {
        logger,
        unitOfWork: {
            execute: jest.fn(async (work) => work(trx)),
        },
        paymentRepository: {
            findByIdempotencyKey: jest.fn().mockResolvedValue(null),
            findByIdForUpdate: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        },
        outboxRepository: {
            save: jest.fn(),
        },
        idGenerator: {
            generate: jest.fn().mockReturnValue("payment-123"),
        },
        clock: {
            now: jest.fn().mockReturnValue(
                new Date("2026-11-05T10:00:00.000Z"),
            ),
        },
        paymentGatewayFactory: {
            create: jest.fn().mockReturnValue(gateway),
        },
        ...overrides,
    };

    return { dependencies, gateway, logger };
}

describe("CreatePaymentUseCase", () => {
    test("creates a payment, initializes the gateway, and flushes its creation event once", async () => {
        const { dependencies, gateway } = makeDependencies();
        let persistedPayment;

        dependencies.paymentRepository.save.mockImplementation(async (payment) => {
            persistedPayment = payment;
        });

        dependencies.paymentRepository.findByIdForUpdate.mockImplementation(
            async () => persistedPayment,
        );

        const useCase = new CreatePaymentUseCase(dependencies);
        const result = await useCase.execute(input, context);

        expect(result.id).toBe("payment-123");
        expect(result.status).toBe("GATEWAY_INITIALIZED");
        expect(result.externalReference).toBe("gateway-ref-123");
        expect(result.checkoutUrl).toBe("https://checkout.example/123");

        expect(dependencies.paymentRepository.save).toHaveBeenCalledTimes(1);
        expect(dependencies.paymentRepository.update).toHaveBeenCalledTimes(1);
        expect(gateway.initializeTransaction).toHaveBeenCalledTimes(1);
        expect(dependencies.outboxRepository.save).toHaveBeenCalledTimes(1);
        expect(dependencies.unitOfWork.execute).toHaveBeenCalledTimes(2);
    });

    test("returns an existing idempotent payment without creating another payment", async () => {
        const existingPayment = makePayment();
        const { dependencies, gateway } = makeDependencies();

        dependencies.paymentRepository.findByIdempotencyKey.mockResolvedValue(
            existingPayment,
        );

        const useCase = new CreatePaymentUseCase(dependencies);
        const result = await useCase.execute(input, context);

        expect(result.id).toBe("existing-payment");
        expect(result.status).toBe("GATEWAY_INITIALIZED");
        expect(dependencies.paymentRepository.save).not.toHaveBeenCalled();
        expect(dependencies.paymentRepository.update).not.toHaveBeenCalled();
        expect(gateway.initializeTransaction).not.toHaveBeenCalled();
        expect(dependencies.outboxRepository.save).not.toHaveBeenCalled();
    });

    test("throws GatewayError when gateway initialization fails", async () => {
        const { dependencies, gateway } = makeDependencies();
        let persistedPayment;

        gateway.initializeTransaction.mockRejectedValue(
            Object.assign(new Error("Provider unavailable"), {
                code: "ECONNRESET",
            }),
        );

        dependencies.paymentRepository.save.mockImplementation(async (payment) => {
            persistedPayment = payment;
        });

        dependencies.paymentRepository.findByIdForUpdate.mockImplementation(
            async () => persistedPayment,
        );

        const useCase = new CreatePaymentUseCase(dependencies);

        await expect(useCase.execute(input, context)).rejects.toThrow(
            "Payment initialization failed via paystack",
        );

        expect(dependencies.paymentRepository.update).toHaveBeenCalledTimes(1);
        expect(persistedPayment.status).toBe("PENDING");
        expect(dependencies.outboxRepository.save).toHaveBeenCalledTimes(1);
    });

    test("resolves a concurrent unique-key conflict using the existing payment", async () => {
        const existingPayment = makePayment();
        const { dependencies, gateway } = makeDependencies();

        dependencies.unitOfWork.execute.mockRejectedValueOnce(
            Object.assign(new Error("duplicate key violates unique constraint"), {
                code: "23505",
            }),
        );

        dependencies.paymentRepository.findByIdempotencyKey.mockResolvedValue(
            existingPayment,
        );

        const useCase = new CreatePaymentUseCase(dependencies);
        const result = await useCase.execute(input, context);

        expect(result.id).toBe("existing-payment");
        expect(result.status).toBe("GATEWAY_INITIALIZED");
        expect(dependencies.paymentRepository.save).not.toHaveBeenCalled();
        expect(gateway.initializeTransaction).not.toHaveBeenCalled();
    });
});
