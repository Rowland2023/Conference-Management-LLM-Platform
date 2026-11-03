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
    this.registrationRepository = registrationRepository;
    this.conferenceRepository = conferenceRepository;
    this.outboxRepository = outboxRepository;
    this.uuidService = uuidService;
    this.transactionManager = transactionManager;
    this.logger = logger.child({
      useCase: "CreateRegistrationUseCase",
    });
  }

  async execute(payload, currentUser, tracingContext = {}) {
    const {
      conferenceId,
      ticketType,
      notes,
      dietaryRequirements,
      specialAssistance,
    } = payload;

    const userId = currentUser.id;

    this.logger.info("Creating registration", {
      conferenceId,
      userId,
      ticketType,
      ...tracingContext,
    });

    try {
      return await this.transactionManager.runInTransaction(async (tx) => {
        this.logger.debug("Loading conference", {
          conferenceId,
          ...tracingContext,
        });

        const conference =
          await this.conferenceRepository.findByIdWithLock(
            conferenceId,
            tx,
          );

        if (!conference) {
          this.logger.warn("Conference not found", {
            conferenceId,
            userId,
            ...tracingContext,
          });

          throw new NotFoundError(
            "Conference not found."
          );
        }

        if (conference.isPastRegistrationDeadline()) {
          this.logger.warn("Registration deadline passed", {
            conferenceId,
            deadline: conference.registrationDeadline,
            ...tracingContext,
          });

          throw new BusinessRuleValidationError(
            "Registration for this conference has closed."
          );
        }

        this.logger.debug("Checking duplicate registration", {
          conferenceId,
          userId,
          ...tracingContext,
        });

        const isAlreadyRegistered =
          await this.registrationRepository.existsByConferenceAndUser(
            conferenceId,
            userId,
            tx,
          );

        if (isAlreadyRegistered) {
          this.logger.warn("Duplicate registration attempt", {
            conferenceId,
            userId,
            ...tracingContext,
          });

          throw new BusinessRuleValidationError(
            "You have already registered for this conference."
          );
        }

        const registration =
          Registration.createPending({
            id: this.uuidService.generate(),
            conferenceId,
            userId,
            ticketType,
            conference,
            notes,
            dietaryRequirements,
            specialAssistance,
          });

        this.logger.debug("Saving registration", {
          registrationId: registration.id,
          ...tracingContext,
        });

        await this.registrationRepository.save(
          registration,
          tx,
        );

        this.logger.debug("Updating conference", {
          conferenceId,
          ...tracingContext,
        });

        await this.conferenceRepository.update(
          conference,
          tx,
        );

        const events = registration.pullDomainEvents();

        this.logger.debug("Saving outbox events", {
          registrationId: registration.id,
          eventCount: events.length,
          ...tracingContext,
        });

        await this.outboxRepository.saveMany(
          events,
          tx,
        );

        this.logger.info(
          "Registration created successfully",
          {
            registrationId: registration.id,
            conferenceId,
            userId,
            ticketType: registration.ticketType,
            ...tracingContext,
          }
        );

        return registration;
      });
    } catch (err) {
      this.logger.error(
        "Failed to create registration",
        {
          conferenceId,
          userId,
          error: err.message,
          stack: err.stack,
          ...tracingContext,
        }
      );

      throw err;
    }
  }
}