import { NotFoundError, UnauthorizedError, BusinessRuleValidationError } from '../../../../shared/domain/error/DomainErrors.js';

export class UpdateRegistrationUseCase {
  constructor({ registrationRepository, conferenceRepository, outboxRepository, transactionManager }) {
    this.registrationRepository = registrationRepository;
    this.conferenceRepository = conferenceRepository;
    this.outboxRepository = outboxRepository;
    this.transactionManager = transactionManager;
  }

  async execute({ registrationId, ticketTier, attendeeNotes } = {}, currentUser) {
    if (!registrationId) {
      throw new NotFoundError("Registration identifier is required.");
    }

    return await this.transactionManager.runInTransaction(async (tx) => {
      // 1. Lock registration first to serialize concurrent edits
      const registration = await this.registrationRepository.findByIdForUpdate(registrationId, tx);
      if (!registration) {
        throw new NotFoundError("Registration not found.");
      }

      // 2. Authorization - blind-wall for attendees and organizers
      if (!currentUser.isAdmin()) {
        if (currentUser.isAttendee()) {
          if (registration.userId !== currentUser.id) {
            throw new NotFoundError("Registration not found.");
          }
          if (ticketTier && ticketTier !== registration.ticketTier) {
            throw new UnauthorizedError("Attendees cannot modify ticket tiers. Use upgrade workflow.");
          }
          if (registration.status === 'CHECKED_IN') {
            throw new BusinessRuleValidationError("Cannot modify registration after check-in.");
          }
        } else if (currentUser.isOrganizer()) {
          const isOwner = await this.conferenceRepository.isOrganizerOf(registration.conferenceId, currentUser.id, tx);
          if (!isOwner) {
            throw new NotFoundError("Registration not found."); // Blind-wall
          }
        } else {
          throw new UnauthorizedError("Invalid execution context.");
        }
      }

      // 3. Lock conference for capacity checks
      const conference = await this.conferenceRepository.findByIdWithLock(registration.conferenceId, tx);
      if (!conference) {
        throw new NotFoundError("Associated conference not found.");
      }

      if (conference.isPastRegistrationDeadline()) {
        throw new BusinessRuleValidationError("Event lifecycle closed. Modifications disabled.");
      }

      // 4. Tier capacity check if changing
      if (ticketTier && ticketTier !== registration.ticketTier) {
        const currentTierCount = await this.registrationRepository.countActiveRegistrationsByTier(
          registration.conferenceId, 
          ticketTier, 
          tx
        );
        if (conference.isTierFullyBooked(ticketTier, currentTierCount)) {
          throw new BusinessRuleValidationError(`Ticket tier [${ticketTier}] is sold out.`);
        }
      }

      // 5. Idempotency check
      if (registration.ticketTier === ticketTier && registration.attendeeNotes === attendeeNotes) {
        return registration; // No-op
      }

      // 6. Domain mutation
      registration.updateDetails({ ticketTier, attendeeNotes });

      // 7. Atomic persist
      await this.registrationRepository.save(registration, tx);
      await this.outboxRepository.saveMany(registration.pullDomainEvents(), tx);

      return registration;
    });
  }
}