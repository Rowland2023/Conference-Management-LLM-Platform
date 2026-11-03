import { jest } from "@jest/globals";
import { EVENT_STATUS } from "../../../src/conference-management/event-schedule/domain/entities/event.js";
import { CreateEventUseCase } from "../../../src/conference-management/event-schedule/application/use-case/create-event.usecase.js";
import {
    ValidationError,
    ConflictError,
} from "../../../src/Shared/application/errors/ApplicationErrors.js";

describe("CreateEventUseCase", () => {
    let eventRepository;
    let outboxRepository;
    let uow;
    let useCase;
    let trx;

    const command = {
        title: "Backend Engineering Conference",
        roomId: "room-123",
        organizerId: "organizer-456",
        startTime: "2035-06-10T10:00:00.000Z",
        endTime: "2035-06-10T11:00:00.000Z",
        correlationId: "correlation-123",
    };

    beforeEach(() => {
        trx = { id: "transaction-1" };

        eventRepository = {
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

        useCase = new CreateEventUseCase({
            eventRepository,
            outboxRepository,
            uow,
        });
    });

    test("creates an event and persists its domain event in the same transaction", async () => {
        const result = await useCase.execute(command);

        expect(result.eventId).toBeTruthy();

        expect(uow.runInTransaction).toHaveBeenCalledTimes(1);

        expect(eventRepository.lockRoomForScheduling)
            .toHaveBeenCalledWith(command.roomId, trx);

        expect(eventRepository.existsOverlappingEvent)
            .toHaveBeenCalledWith(
                command.roomId,
                command.startTime,
                command.endTime,
                null,
                trx,
            );

        const [savedEvent, saveTransaction] =
            eventRepository.save.mock.calls[0];

        expect(savedEvent).toMatchObject({
            id: result.eventId,
            title: command.title,
            roomID: command.roomId,
            organizerId: command.organizerId,
            status: EVENT_STATUS.SCHEDULED,
            version: 0,
        });
        expect(saveTransaction).toBe(trx);

        const [domainEvents, outboxTransaction] =
            outboxRepository.save.mock.calls[0];

        expect(domainEvents).toHaveLength(1);
        expect(domainEvents[0].metadata.eventName).toBe("event.scheduled");
        expect(domainEvents[0].metadata.aggregateId).toBe(result.eventId);
        expect(outboxTransaction).toBe(trx);
    });

    test("rejects a command with missing required information", async () => {
        await expect(
            useCase.execute({
                ...command,
                organizerId: undefined,
            }),
        ).rejects.toBeInstanceOf(ValidationError);

        expect(uow.runInTransaction).not.toHaveBeenCalled();
        expect(eventRepository.save).not.toHaveBeenCalled();
        expect(outboxRepository.save).not.toHaveBeenCalled();
    });

    test("rejects creation when the room already has an overlapping event", async () => {
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

        expect(eventRepository.save).toHaveBeenCalledTimes(1);
        expect(outboxRepository.save).toHaveBeenCalledTimes(1);
    });
});
