import { DomainInvariantError } from "../../../../Shared/domain/error/DomainErrors.js";

/**
 * Domain Service
 * 
 * Encapsulates cross-aggregate scheduling policies requiring historical 
 * context from the persistence layer.
 */
export class EventSchedulingService {
  constructor({ eventRepository }) {
    if (!eventRepository) {
      throw new Error("EventSchedulingService Critical Failure: eventRepository required.");
    }
    this.eventRepository = eventRepository;
  }

  /**
   * Validates whether a new event allocation satisfies booking availability invariants.
   * 
   * @param {Object} params
   * @param {string} params.roomId
   * @param {Date|string} params.startTime
   * @param {Date|string} params.endTime
   * @throws {DomainInvariantError}
   */
  async ensureCanSchedule({ roomId, startTime, endTime }) {
    const cleanedRoomId = this.#validateAndCleanRoomId(roomId);
    const { start, end } = this.#validateAndNormalizeTimeWindow(startTime, endTime);

    // Enforce temporal validity: Cannot book events entirely in the past
    if (end.getTime() <= Date.now()) {
      throw new DomainInvariantError("Scheduling policy failure: Cannot schedule an event that concludes in the past.");
    }

    const hasConflict = await this.eventRepository.existsOverlappingEvent(
      cleanedRoomId,
      start.toISOString(),
      end.toISOString(),
      null,
      null,
    );

    if (hasConflict) {
      throw new DomainInvariantError(
        `Room reservation conflict: Room [${cleanedRoomId}] is already reserved during ${start.toISOString()} - ${end.toISOString()}.`
      );
    }
  }

  /**
   * Validates whether an existing event block can be cleanly relocated.
   * 
   * @param {Object} event - Event Aggregate instance
   * @param {Date|string} newStartTime
   * @param {Date|string} newEndTime
   * @throws {DomainInvariantError}
   */
  async ensureCanReschedule(event, newStartTime, newEndTime) {
    if (!event?.id) {
      throw new DomainInvariantError("EventSchedulingService: Valid event aggregate instance required.");
    }
    
    const cleanedRoomId = this.#validateAndCleanRoomId(event.roomID);
    const { start, end } = this.#validateAndNormalizeTimeWindow(newStartTime, newEndTime);

    if (end.getTime() <= Date.now()) {
      throw new DomainInvariantError("Scheduling policy failure: Cannot reschedule an event to conclude in the past.");
    }

    const hasConflict = await this.eventRepository.existsOverlappingEvent(
      cleanedRoomId,
      start.toISOString(),
      end.toISOString(),
      event.id,
      null,
    );

    if (hasConflict) {
      throw new DomainInvariantError(
        `Room reservation conflict: Room [${cleanedRoomId}] is already reserved during the requested rescheduling window.`
      );
    }
  }

  /**
   * Asserts structural presence and sanely normalizes room references.
   * 
   * @private
   * @param {string} roomId
   * @returns {string} Cleaned roomId
   */
  #validateAndCleanRoomId(roomId) {
    if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
      throw new DomainInvariantError("Scheduling policy failure: A valid, non-empty roomId string is required.");
    }
    return roomId.trim();
  }

  /**
   * Asserts and standardizes chronological boundary windows.
   * 
   * @private
   * @param {Date|string} startTime
   * @param {Date|string} endTime
   * @returns {{ start: Date, end: Date }}
   */
  #validateAndNormalizeTimeWindow(startTime, endTime) {
    if (!startTime || !endTime) {
      throw new DomainInvariantError("Scheduling policy failure: Both start and end time parameters are mandatory.");
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime())) throw new DomainInvariantError("Scheduling policy failure: Provided startTime is an invalid Date format.");
    if (Number.isNaN(end.getTime())) throw new DomainInvariantError("Scheduling policy failure: Provided endTime is an invalid Date format.");
    
    if (start.getTime() >= end.getTime()) {
      throw new DomainInvariantError("Chronological policy failure: The event allocation endTime must succeed the startTime.");
    }

    return { start, end };
  }
}