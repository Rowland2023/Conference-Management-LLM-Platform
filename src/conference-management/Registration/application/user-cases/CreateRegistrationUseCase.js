
import {
  NotFoundError,
  BusinessRuleValidationError,
} from "../../../../shared/domain/error/DomainErrors.js";
import { Registration } from "../../domain/entities/Registration.js";

export class CreateRegistrationUseCase {
  constructor({
    registrationRepository,
    conferenceRepository,
    outboxRepository,
    uuidService,
    transactionManager,
    logger,
  }) {
    Object.assign(this, {
      registrationRepository,
      conferenceRepository,
      outboxRepository,
      uuidService,
      transactionManager,
      logger,
    });

    if (!transactionManager?.runInTransaction) {
      throw new TypeError(
        "transactionManager.runInTransaction is required."
      );
    }
  }

  async execute(input = {}, currentUser, tracingContext = {}) {
    const conferenceId = input.conferenceId ?? input.eventId;
    const userId = currentUser?.id;
    const ticketTier = input.ticketTier ?? input.ticketType;

    if (!userId) throw new TypeError("Authenticated user is required.");
    if (!conferenceId) throw new TypeError("eventId is required.");
    if (!ticketTier) throw new TypeError("ticketType is required.");

    return this.transactionManager.runInTransaction(async tx => {
      const conference =
        await this.conferenceRepository.findByIdWithLock(
          conferenceId,
          tx
        );

      if (!conference) {
        throw new NotFoundError("Conference not found.");
      }

      // This adapter method must match the actual conference schema.
      if (!this.conferenceRepository.assertRegistrationOpen(conference)) {
        throw new BusinessRuleValidationError(
          "Registration for this conference is closed."
        );
      }

      const duplicate =
        await this.registrationRepository.existsByConferenceAndUser(
          conferenceId,
          userId,
          tx
        );

      if (duplicate) {
        throw new BusinessRuleValidationError(
          "You have already registered for this conference."
        );
      }

      const tier = String(ticketTier).toUpperCase();
      const activeCount =
        await this.registrationRepository.countActiveRegistrationsByTier(
          conferenceId,
          tier,
          tx
        );

      if (
        !this.conferenceRepository.assertTierAvailable(
          conference,
          tier,
          activeCount
        )
      ) {
        throw new BusinessRuleValidationError(
          `Ticket tier ${tier} is sold out.`
        );
      }

      const registration = Registration.createPending({
        id: this.uuidService.generate(),
        conferenceId,
        userId,
        ticketTier: tier,
        attendeeNotes: input.attendeeNotes ?? input.notes ?? null,
        dietaryRequirements: input.dietaryRequirements ?? null,
        specialAssistance: input.specialAssistance ?? null,
      });

      await this.registrationRepository.save(registration, tx);

      const events = registration.pullDomainEvents();
      if (events.length) {
        await this.outboxRepository.save(events, tx);
      }

      this.logger?.info?.("Registration created", {
        registrationId: registration.id,
        conferenceId,
        userId,
        correlationId: tracingContext.correlationId,
      });

      return registration;
    });
  }
}
