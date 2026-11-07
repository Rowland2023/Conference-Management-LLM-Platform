
import { PostgresOutboxRepository }
    from "../../../../../../src/Shared/Infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import { BaseDomainEvent }
    from "../../../../../../src/conference-management/accounting-services/ledger/domain/events/base-domain.event.js";

import { jest } from "@jest/globals";

function createQueryBuilder(result = undefined) {
    const builder = {};

    for (const method of [
        "insert",
        "where",
        "whereIn",
        "orderBy",
        "limit",
        "forUpdate",
        "skipLocked",
        "update",
        "increment",
    ]) {
        builder[method] = jest.fn().mockReturnValue(builder);
    }

    builder.skipLocked.mockResolvedValue(result);
    builder.update.mockResolvedValue(undefined);
    builder.insert.mockResolvedValue(undefined);

    return builder;
}

describe("PostgresOutboxRepository", () => {
    let db;
    let trx;
    let repository;

    beforeEach(() => {
        trx = jest.fn();
        trx.fn = {
            now: jest.fn().mockReturnValue("DB_NOW"),
        };

        const queryBuilder = createQueryBuilder();

        db = jest.fn().mockReturnValue(queryBuilder);
        db.fn = {
            now: jest.fn().mockReturnValue("DB_NOW"),
        };
        db.raw = jest.fn().mockReturnValue("RETRY_AT_SQL");
        db.transaction = jest.fn(
            async (callback) => callback(trx)
        );

        repository = new PostgresOutboxRepository({ db });
    });

    test("persists event fields from BaseDomainEvent getters", async () => {
        const occurredAt = new Date("2026-10-25T10:30:00.000Z");

        const event = new BaseDomainEvent({
            eventId: "11111111-1111-4111-8111-111111111111",
            eventName: "account.held",
            aggregateId: "account-123",
            occurredAt,
            payload: {
                accountId: "account-123",
                amount: "250.00",
            },
            metadata: {
                aggregateType: "Account",
                correlationId: "22222222-2222-4222-8222-222222222222",
            },
        });

        const insert = jest.fn().mockResolvedValue(undefined);
        const queryBuilder = { insert };
        trx.mockReturnValue(queryBuilder);

        await repository.save(event, trx);

        expect(trx).toHaveBeenCalledWith("outbox_events");
        expect(insert).toHaveBeenCalledTimes(1);

        expect(insert).toHaveBeenCalledWith([
            {
                id: event.eventId,
                aggregate_type: "Account",
                aggregate_id: "account-123",
                event_type: "account.held",
                payload: JSON.stringify({
                    accountId: "account-123",
                    amount: "250.00",
                }),
                status: "PENDING",
                retry_count: 0,
                max_retries: 5,
                next_retry_at: "DB_NOW",
                correlation_id: "22222222-2222-4222-8222-222222222222",
                created_at: occurredAt,
            },
        ]);
    });

    test("persists event fields from shared DomainEvent metadata", async () => {
        const occurredAt = "2026-10-25T10:30:00.000Z";

        class SharedDomainEventFixture {
            constructor() {
                this.metadata = Object.freeze({
                    eventId: "44444444-4444-4444-8444-444444444444",
                    eventName: "ticket.created",
                    aggregateId: "ticket-123",
                    eventVersion: 1,
                    occurredAt,
                    correlationId: "55555555-5555-4555-8555-555555555555",
                    causationId: null,
                });

                this.payload = Object.freeze({
                    ticketId: "ticket-123",
                    conferenceId: "conference-123",
                    type: "standard",
                    capacity: 100,
                    price: "250.00",
                    currency: "NGN",
                });
            }
        }

        const event = new SharedDomainEventFixture();
        const insert = jest.fn().mockResolvedValue(undefined);

        trx.mockReturnValue({ insert });

        await repository.save(event, trx);

        expect(trx).toHaveBeenCalledWith("outbox_events");
        expect(insert).toHaveBeenCalledTimes(1);
        expect(insert).toHaveBeenCalledWith([
            {
                id: "44444444-4444-4444-8444-444444444444",
                aggregate_type: "SharedDomainEventFixture",
                aggregate_id: "ticket-123",
                event_type: "ticket.created",
                payload: JSON.stringify(event.payload),
                status: "PENDING",
                retry_count: 0,
                max_retries: 5,
                next_retry_at: "DB_NOW",
                correlation_id: "55555555-5555-4555-8555-555555555555",
                created_at: occurredAt,
            },
        ]);
    });

    test("persists multiple events in one insert using the supplied transaction", async () => {
        const firstEvent = new BaseDomainEvent({
            eventId: "11111111-1111-4111-8111-111111111111",
            eventName: "account.held",
            aggregateId: "account-123",
            payload: { holdId: "hold-1" },
        });

        const secondEvent = new BaseDomainEvent({
            eventId: "33333333-3333-4333-8333-333333333333",
            eventName: "account.released",
            aggregateId: "account-456",
            payload: { holdId: "hold-2" },
        });

        const insert = jest.fn().mockResolvedValue(undefined);
        trx.mockReturnValue({ insert });

        await repository.save([firstEvent, secondEvent], trx);

        expect(trx).toHaveBeenCalledTimes(1);
        expect(trx).toHaveBeenCalledWith("outbox_events");
        expect(insert).toHaveBeenCalledTimes(1);

        const rows = insert.mock.calls[0][0];

        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            id: firstEvent.eventId,
            aggregate_id: firstEvent.aggregateId,
            event_type: firstEvent.eventName,
            payload: JSON.stringify(firstEvent.payload),
        });
        expect(rows[1]).toMatchObject({
            id: secondEvent.eventId,
            aggregate_id: secondEvent.aggregateId,
            event_type: secondEvent.eventName,
            payload: JSON.stringify(secondEvent.payload),
        });
    });

    test("uses the event constructor name when aggregate type metadata is absent", async () => {
        const event = new BaseDomainEvent({
            eventId: "11111111-1111-4111-8111-111111111111",
            eventName: "account.held",
            aggregateId: "account-123",
            payload: {},
        });

        const insert = jest.fn().mockResolvedValue(undefined);
        trx.mockReturnValue({ insert });

        await repository.save(event, trx);

        expect(insert).toHaveBeenCalledWith([
            expect.objectContaining({
                aggregate_type: event.constructor.name,
                correlation_id: null,
                next_retry_at: "DB_NOW",
            }),
        ]);
    });

    test("fetches and locks pending events, then marks them as processing", async () => {
        const rows = [
            { id: "event-1" },
            { id: "event-2" },
        ];

        const fetchBuilder = createQueryBuilder(rows);
        const updateBuilder = createQueryBuilder();

        trx.mockReturnValueOnce(fetchBuilder)
            .mockReturnValueOnce(updateBuilder);

        const result = await repository.fetchAndLockPending(20, 3);

        expect(db.transaction).toHaveBeenCalledTimes(1);
        expect(trx).toHaveBeenCalledWith("outbox_events");

        expect(fetchBuilder.where).toHaveBeenNthCalledWith(
            1, "status", "PENDING"
        );
        expect(fetchBuilder.where).toHaveBeenNthCalledWith(
            2, "retry_count", "<", 3
        );
        expect(fetchBuilder.where).toHaveBeenNthCalledWith(
            3, "next_retry_at", "<=", "DB_NOW"
        );
        expect(fetchBuilder.orderBy).toHaveBeenCalledWith(
            "created_at", "asc"
        );
        expect(fetchBuilder.limit).toHaveBeenCalledWith(20);
        expect(fetchBuilder.forUpdate).toHaveBeenCalledTimes(1);
        expect(fetchBuilder.skipLocked).toHaveBeenCalledTimes(1);

        expect(updateBuilder.whereIn).toHaveBeenCalledWith(
            "id", ["event-1", "event-2"]
        );
        expect(updateBuilder.update).toHaveBeenCalledWith({
            status: "PROCESSING",
        });

        expect(result).toEqual(rows);
    });

    test("returns an empty array without updating when no pending events exist", async () => {
        const fetchBuilder = createQueryBuilder([]);
        trx.mockReturnValue(fetchBuilder);

        const result = await repository.fetchAndLockPending();

        expect(result).toEqual([]);
        expect(trx).toHaveBeenCalledTimes(1);
        expect(fetchBuilder.skipLocked).toHaveBeenCalledTimes(1);
    });

    test("marks an event as dispatched", async () => {
        const update = jest.fn().mockResolvedValue(undefined);
        const where = jest.fn().mockReturnValue({ update });

        db.mockReturnValue({ where });

        await repository.markAsDispatched("event-1");

        expect(db).toHaveBeenCalledWith("outbox_events");
        expect(where).toHaveBeenCalledWith({ id: "event-1" });
        expect(update).toHaveBeenCalledWith({
            status: "PROCESSED",
            processed_at: "DB_NOW",
        });
    });

    test("increments retry count and records the retry error", async () => {
        const update = jest.fn().mockResolvedValue(undefined);
        const increment = jest.fn().mockReturnValue({ update });
        const where = jest.fn().mockReturnValue({ increment });

        db.mockReturnValue({ where });

        await repository.incrementRetry(
            "event-1",
            "Kafka temporarily unavailable"
        );

        expect(db).toHaveBeenCalledWith("outbox_events");
        expect(where).toHaveBeenCalledWith({ id: "event-1" });
        expect(increment).toHaveBeenCalledWith("retry_count", 1);
        expect(update).toHaveBeenCalledWith({
            status: "PENDING",
            last_error: "Kafka temporarily unavailable",
            next_retry_at: "RETRY_AT_SQL",
        });
        expect(db.raw).toHaveBeenCalledWith(
            "NOW() + INTERVAL '30 seconds'"
        );
    });

    test("marks an event as failed", async () => {
        const update = jest.fn().mockResolvedValue(undefined);
        const where = jest.fn().mockReturnValue({ update });

        db.mockReturnValue({ where });

        await repository.markAsFailed(
            "event-1",
            "Maximum retries exceeded"
        );

        expect(db).toHaveBeenCalledWith("outbox_events");
        expect(where).toHaveBeenCalledWith({ id: "event-1" });
        expect(update).toHaveBeenCalledWith({
            status: "FAILED",
            last_error: "Maximum retries exceeded",
            processed_at: "DB_NOW",
        });
    });

    test("rejects construction without a database instance", () => {
        expect(
            () => new PostgresOutboxRepository({})
        ).toThrow("PostgresOutboxRepository requires a Knex instance.");
    });
});
