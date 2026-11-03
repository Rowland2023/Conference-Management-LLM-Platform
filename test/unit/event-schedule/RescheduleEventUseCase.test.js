
import { jest } from "@jest/globals";
import { Event } from "../../../src/conference-management/event-schedule/domain/entities/event.js";
import { RescheduleEventUseCase } from "../../../src/conference-management/event-schedule/application/use-case/reschedule-event.usecase.js";
import {
    ValidationError,
    NotFoundError,
    ConflictError,
} from "../../../src/Shared/application/errors/ApplicationErrors.js";

const originalStart = "2035-06-10T10:00:00.000Z";
const originalEnd = "2035-06-10T11:00:00.000Z";
const newStart = "2035-06-12T13:00:00.000Z";
const newEnd = "2035-06-12T14:30:00.000Z";

function createExistingEvent() {
    const event = Event.create({
        title: "Backend Engineering Conference",
        roomID: "room-123",
        organizerId: "organizer-456",
        startTime: originalStart,
        endTime: originalEnd,
    });

    // The initial EventScheduled event was already persisted.
    event.pullEvents();

    return event;
}

describe("RescheduleEventUseCase", () => {
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
            startTime: newStart,
            endTime: newEnd,
            rescheduledBy: "organizer-456",
            reason: "Speaker availability",
            correlationId: "correlation-123",
        };

        eventRepository = {
            findByIdForUpdate: jest.fn().mockResolvedValue(event),
            lockRoomForScheduling: jest.fn().mockResolvedValue(undefined),
            existsOverlappingEvent: jest.fn().mockResolvedValue(false),
            save: jest.fn().mockResolvedValue(undefined),
        };

        outboxRepository = {
            save: jest.fn().mockResolvedValue(undefined),
        };

        uow = {
            runInTransaction: jest.fn(async (work) => work(trx)),
        };

        useCase = new RescheduleEventUseCase({
            eventRepository,
            outboxRepository,
            uow,
        });
    });

    test("reschedules the event and persists its domain event in the same transaction", async () => {
        const result = await useCase.execute(command);

        expect(result).toMatchObject({
            eventId: event.id,
            startTime: new Date(newStart).toISOString(),
            endTime: new Date(newEnd).toISOString(),
            status: event.status,
            version: 1,
        });

        expect(eventRepository.findByIdForUpdate)
            .toHaveBeenCalledWith(command.eventId, trx);

        expect(eventRepository.lockRoomForScheduling)
            .toHaveBeenCalledWith(event.roomID, trx);

        expect(eventRepository.existsOverlappingEvent)
            .toHaveBeenCalledWith(
                event.roomID,
                newStart,
                newEnd,
                command.eventId,
                trx,
            );

        expect(eventRepository.save).toHaveBeenCalledWith(event, trx);

        const [domainEvents, outboxTransaction] =
            outboxRepository.save.mock.calls[0];

        expect(domainEvents).toHaveLength(1);
        expect(domainEvents[0].metadata.eventName).toBe("event.rescheduled");
        expect(domainEvents[0].payload).toMatchObject({
            eventId: event.id,
            rescheduledBy: command.rescheduledBy,
            reason: command.reason,
        });
        expect(outboxTransaction).toBe(trx);
    });

    test("rejects a command missing the rescheduling actor", async () => {
        await expect(
            useCase.execute({
                ...command,
                rescheduledBy: undefined,
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

    test("rejects a reschedule that conflicts with another event", async () => {
        eventRepository.existsOverlappingEvent.mockResolvedValue(true);

        await expect(useCase.execute(command))
            .rejects.toBeInstanceOf(ConflictError);

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
