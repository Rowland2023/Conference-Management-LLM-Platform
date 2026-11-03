import { NotFoundError } from '../../../../shared/domain/error/DomainErrors.js';

export class CancelRegistrationUseCase {
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

    return await this.transactionManager.runInTransaction(async (tx) => {
      const registration = await this.registrationRepository.findByIdForUpdate(registrationId, tx);
      if (!registration) {
        throw new NotFoundError("Registration not found.");
      }

      // Authorization: Admin bypass, else check ownership
      if (!currentUser.isAdmin()) {
        if (currentUser.isAttendee() && registration.userId !== currentUser.id) {
          throw new NotFoundError("Registration not found."); // Blind-wall
        }
        if (currentUser.isOrganizer()) {
          const isOwner = await this.conferenceRepository.isOrganizerOf(
            registration.conferenceId, 
            currentUser.id, 
            tx
          );
          if (!isOwner) {
            throw new NotFoundError("Registration not found."); // Blind-wall
          }
        }
      }

      const conference = await this.conferenceRepository.findById(registration.conferenceId, tx);
      if (!conference) {
        throw new NotFoundError("Associated conference not found.");
      }

      if (conference.isPastCancellationDeadline?.() || conference.isPastRegistrationDeadline()) {
        throw new BusinessRuleValidationError(
          "Event lifecycle closed. Cancellations no longer permitted."
        );
      }

      registration.cancel(); // Domain state machine + emits event

      await this.registrationRepository.update(registration, tx);
      await this.outboxRepository.saveMany(registration.pullDomainEvents(), tx);
      
      // Return void. Controller handles HTTP.
    });
  }
}