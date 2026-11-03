import { NotFoundError, UnauthorizedError, BusinessRuleValidationError } from '../../../../shared/domain/error/DomainErrors.js';

export class CheckInRegistrationUseCase {
  constructor({ registrationRepository, conferenceRepository, outboxRepository, transactionManager }) {
    this.registrationRepository = registrationRepository;
    this.conferenceRepository = conferenceRepository;
    this.outboxRepository = outboxRepository;
    this.transactionManager = transactionManager;
  }

  async execute({ registrationId, currentUser }) {
    if (!registrationId) {
      throw new NotFoundError("Registration identifier is required.");
    }

    if (!currentUser.isAdmin() && !currentUser.isOrganizer()) {
      throw new UnauthorizedError("Only organizers or administrators can check in attendees.");
    }

    return await this.transactionManager.runInTransaction(async (tx) => {
      const registration = await this.registrationRepository.findByIdForUpdate(registrationId, tx);
      if (!registration) {
        throw new NotFoundError("Registration not found.");
      }

      // Multi-tenant guard
      if (currentUser.isOrganizer()) {
        const isOwner = await this.conferenceRepository.isOrganizerOf(
          registration.conferenceId, 
          currentUser.id, 
          tx
        );
        if (!isOwner) {
          throw new UnauthorizedError("You do not have permission to manage this event's roster.");
        }
      }

      // Temporal guard
      const conference = await this.conferenceRepository.findById(registration.conferenceId, tx);
      if (!conference.isCheckInWindowOpen()) {
        throw new BusinessRuleValidationError(
          `Check-in is only available from ${conference.checkInOpensAt} to ${conference.checkInClosesAt}`
        );
      }

      // Idempotent domain mutation
      const wasAlreadyCheckedIn = registration.isCheckedIn();
      registration.checkIn({ conference, checkedInBy: currentUser.id });

      await this.registrationRepository.update(registration, tx);
      await this.outboxRepository.saveMany(registration.pullDomainEvents(), tx);

      return registration; // Return entity, not HTTP payload
    });
  }
}