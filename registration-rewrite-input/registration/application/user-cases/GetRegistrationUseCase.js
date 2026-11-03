import { NotFoundError, UnauthorizedError } from '../../../../shared/domain/error/DomainErrors.js';

export class GetRegistrationUseCase {
  constructor({ registrationRepository }) {
    this.registrationRepository = registrationRepository;
  }

  async execute({ registrationId } = {}, currentUser) {
    if (!registrationId) {
      throw new NotFoundError("Registration identifier is required.");
    }

    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundError("Registration not found.");
    }

    // Authorization
    if (!currentUser.isAdmin()) {
      if (currentUser.isAttendee()) {
        if (registration.userId !== currentUser.id) {
          throw new NotFoundError("Registration not found."); // Blind-wall
        }
      } else if (currentUser.isOrganizer()) {
        // Use cached permissions - no DB hit
        if (!currentUser.organizedConferenceIds?.includes(registration.conferenceId)) {
          throw new UnauthorizedError("Unauthorized: This registration belongs to an unmanaged event.");
        }
      } else {
        throw new UnauthorizedError("Unknown user role.");
      }
    }

    return registration; // Return entity, controller maps to DTO
  }
}