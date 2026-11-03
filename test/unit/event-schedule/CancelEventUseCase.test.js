
import { jest } from "@jest/globals";
import { Event } from "../../../src/conference-management/event-schedule/domain/entities/event.js";
import { CancelEventUseCase } from "../../../src/conference-management/event-schedule/application/use-case/cancel-event.usecase.js";
import {
    ValidationError,
    NotFoundError,
} from "../../../src/Shared/application/errors/ApplicationErrors.js";

function createExistingEvent() {
    const event = Event.create({
        title: "Backend Engineering Conference",
        roomID: "room-123",
        organizerId: "organizer-456",
        startTime: "2035-06-10T10:00:00.000Z",
        endTime: "2035-06-10T11:00:00.000Z",
    });

    // The initial EventScheduled event was already persisted.
    event.pullEvents();

    return event;
}

describe("CancelEventUseCase", () => {
    let eventRepository;
    let outboxRepository;
    let uow;
    let useCase;
    let event;
    let trx;
    let command;

    beforeEach(() => {
        event = createExistingEvent();
        trx = { id: "transaction-1" };

        command = {
            eventId: event.id,
            cancelledBy: "organizer-456",
            reason: "Venue unavailable",
            correlationId: "correlation-123",
        };

        eventRepository = {
            findByIdForUpdate: jest.fn().mockResolvedValue(event),
            save: jest.fn().mockResolvedValue(undefined),
        };

        outboxRepository = {
            save: jest.fn().mockResolvedValue(undefined),
        };

        uow = {
            runInTransaction: jest.fn(async (work) => work(trx)),
        };

        useCase = new CancelEventUseCase({
            eventRepository,
            outboxRepository,
            uow,
        });
    });

    test("cancels the event and persists its domain event in the same transaction", async () => {
        const result = await useCase.execute(command);

        expect(result).toMatchObject({
            eventId: event.id,
            status: event.status,
            version: 1,
        });

        expect(eventRepository.findByIdForUpdate)
            .toHaveBeenCalledWith(command.eventId, trx);

        expect(eventRepository.save).toHaveBeenCalledWith(event, trx);

        const [domainEvents, outboxTransaction] =
            outboxRepository.save.mock.calls[0];

        expect(domainEvents).toHaveLength(1);
        expect(domainEvents[0].metadata.eventName).toBe("event.cancelled");
        expect(domainEvents[0].payload).toMatchObject({
            eventId: event.id,
            cancelledBy: command.cancelledBy,
            reason: command.reason,
        });
        expect(outboxTransaction).toBe(trx);
    });

    test("rejects cancellation without an actor", async () => {
        await expect(
            useCase.execute({
                ...command,
                cancelledBy: undefined,
            }),
        ).rejects.toBeInstanceOf(ValidationError);

        expect(uow.runInTransaction).not.toHaveBeenCalled();
    });

    test("rejects when the event does not exist", async () => {
        eventRepository.findByIdForUpdate.mockResolvedValue(null);

        await expect(useCase.execute(command))
            .rejects.toBeInstanceOf(NotFoundError);

        expect(eventRepository.save).not.toHaveBeenCalled();
        expect(outboxRepository.save).not.toHaveBeenCalled();
    });

    test("propagates an outbox persistence failure", async () => {
        outboxRepository.save.mockRejectedValue(
            new Error("Outbox database unavailable"),
        );

        await expect(useCase.execute(command))
            .rejects.toThrow("Outbox database unavailable");

        expect(eventRepository.save).toHaveBeenCalledWith(event, trx);
    });
});
