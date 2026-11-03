
import {
  NotFoundError,
  UnauthorizedError,
  BusinessRuleValidationError,
} from "../../../../shared/domain/error/DomainErrors.js";

export class CheckInRegistrationUseCase {
  constructor({
    registrationRepository,
    conferenceRepository,
    outboxRepository,
    transactionManager,
  }) {
    Object.assign(this, {
      registrationRepository,
      conferenceRepository,
      outboxRepository,
      transactionManager,
    });
  }

  async execute(input = {}, currentUser, tracingContext = {}) {
    const registrationId = input.registrationId ?? input.id;

    if (!registrationId) {
      throw new NotFoundError("Registration id is required.");
    }
    if (!currentUser) {
      throw new UnauthorizedError("Authentication is required.");
    }

    return this.transactionManager.runInTransaction(async tx => {
      const registration =
        await this.registrationRepository.findByIdForUpdate(
          registrationId,
          tx
        );

      if (!registration) {
        throw new NotFoundError("Registration not found.");
      }

      const isAdmin =
        typeof currentUser.isAdmin === "function" &&
        currentUser.isAdmin();

      const isOrganizer =
        typeof currentUser.isOrganizer === "function" &&
        currentUser.isOrganizer();

      if (!isAdmin && !isOrganizer) {
        throw new UnauthorizedError(
          "Only organizers or administrators can check in attendees."
        );
      }

      if (
        isOrganizer &&
        !isAdmin &&
        !(await this.conferenceRepository.isOrganizerOf(
          registration.conferenceId,
          currentUser.id,
          tx
        ))
      ) {
        throw new NotFoundError("Registration not found.");
      }

      const conference =
        await this.conferenceRepository.findById(
          registration.conferenceId,
          tx
        );

      if (!conference) {
        throw new NotFoundError("Conference not found.");
      }

      if (!this.conferenceRepository.assertCheckInOpen(conference)) {
        throw new BusinessRuleValidationError(
          "Check-in is not open for this conference."
        );
      }

      if (registration.isCheckedIn()) {
        return registration;
      }

      registration.checkIn();

      await this.registrationRepository.save(registration, tx);

      const events = registration.pullDomainEvents();
      if (events.length) {
        await this.outboxRepository.save(events, tx);
      }

      return registration;
    });
  }
}
