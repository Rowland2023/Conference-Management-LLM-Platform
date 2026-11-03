
import {
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/domain/error/DomainErrors.js";

export class CancelRegistrationUseCase {
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

      const isAttendee =
        typeof currentUser.isAttendee === "function" &&
        currentUser.isAttendee();

      const isOrganizer =
        typeof currentUser.isOrganizer === "function" &&
        currentUser.isOrganizer();

      if (!isAdmin) {
        if (isAttendee && registration.userId === currentUser.id) {
          // An attendee may cancel their own registration.
        } else if (isOrganizer) {
          const authorized =
            await this.conferenceRepository.isOrganizerOf(
              registration.conferenceId,
              currentUser.id,
              tx
            );

          if (!authorized) {
            throw new NotFoundError("Registration not found.");
          }
        } else {
          throw new UnauthorizedError("Not allowed to cancel this registration.");
        }
      }

      registration.cancel();

      await this.registrationRepository.save(registration, tx);

      const events = registration.pullDomainEvents();
      if (events.length) {
        await this.outboxRepository.save(events, tx);
      }

      return registration;
    });
  }
}
