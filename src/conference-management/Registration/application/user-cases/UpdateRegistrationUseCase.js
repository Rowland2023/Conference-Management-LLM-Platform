
import {
  NotFoundError,
  UnauthorizedError,
  BusinessRuleValidationError,
} from "../../../../shared/domain/error/DomainErrors.js";

export class UpdateRegistrationUseCase {
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
    const data = input.data ?? input;

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

      const requestedTier = data.ticketTier ?? data.ticketType;

      if (!isAdmin) {
        if (isAttendee) {
          if (registration.userId !== currentUser.id) {
            throw new NotFoundError("Registration not found.");
          }

          if (
            requestedTier !== undefined &&
            String(requestedTier).toUpperCase() !== registration.ticketTier
          ) {
            throw new UnauthorizedError(
              "Attendees cannot change their ticket tier."
            );
          }

          if (registration.status === "CHECKED_IN") {
            throw new BusinessRuleValidationError(
              "Checked-in registrations cannot be changed."
            );
          }
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
          throw new UnauthorizedError("Unsupported user role.");
        }
      }

      const conference =
        await this.conferenceRepository.findByIdWithLock(
          registration.conferenceId,
          tx
        );

      if (!conference) {
        throw new NotFoundError("Conference not found.");
      }

      if (
        !this.conferenceRepository.assertRegistrationOpen(conference)
      ) {
        throw new BusinessRuleValidationError(
          "Registration changes are closed."
        );
      }

      if (
        requestedTier !== undefined &&
        String(requestedTier).toUpperCase() !== registration.ticketTier
      ) {
        const tier = String(requestedTier).toUpperCase();
        const count =
          await this.registrationRepository.countActiveRegistrationsByTier(
            registration.conferenceId,
            tier,
            tx
          );

        if (
          !this.conferenceRepository.assertTierAvailable(
            conference,
            tier,
            count
          )
        ) {
          throw new BusinessRuleValidationError(
            `Ticket tier ${tier} is sold out.`
          );
        }
      }

      registration.updateDetails({
        ticketTier:
          requestedTier === undefined
            ? undefined
            : String(requestedTier).toUpperCase(),
        attendeeNotes: data.attendeeNotes ?? data.notes,
        dietaryRequirements: data.dietaryRequirements,
        specialAssistance: data.specialAssistance,
      });

      await this.registrationRepository.save(registration, tx);

      const events = registration.pullDomainEvents();
      if (events.length) {
        await this.outboxRepository.save(events, tx);
      }

      return registration;
    });
  }
}
