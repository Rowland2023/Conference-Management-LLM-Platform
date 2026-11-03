
import {
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/domain/error/DomainErrors.js";

export class GetRegistrationUseCase {
  constructor({ registrationRepository, conferenceRepository }) {
    this.registrationRepository = registrationRepository;
    this.conferenceRepository = conferenceRepository;
  }

  async execute({ registrationId, id } = {}, currentUser) {
    const targetId = registrationId ?? id;

    if (!targetId) {
      throw new NotFoundError("Registration id is required.");
    }
    if (!currentUser) {
      throw new UnauthorizedError("Authentication is required.");
    }

    const registration =
      await this.registrationRepository.findById(targetId);

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

    if (isAdmin) return registration;

    if (isAttendee && registration.userId === currentUser.id) {
      return registration;
    }

    if (isOrganizer) {
      const authorized =
        await this.conferenceRepository.isOrganizerOf(
          registration.conferenceId,
          currentUser.id
        );

      if (authorized) return registration;
    }

    // Avoid revealing whether another user's registration exists.
    throw new NotFoundError("Registration not found.");
  }
}
