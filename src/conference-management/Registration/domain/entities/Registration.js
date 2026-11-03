
import { AggregateRoot } from "../../../../shared/domain/AggregateRoot.js";
import { DomainInvariantError } from "../../../../shared/domain/error/DomainErrors.js";

const VALID_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "CHECKED_IN",
]);

const VALID_TIERS = new Set([
  "STANDARD",
  "VIP",
  "STUDENT",
  "SPEAKER",
  "SPONSOR",
]);

export class Registration extends AggregateRoot {
  constructor({
    id,
    conferenceId,
    userId,
    ticketTier,
    status = "PENDING",
    attendeeNotes = null,
    dietaryRequirements = null,
    specialAssistance = null,
    paymentId = null,
    checkedInAt = null,
    cancelledAt = null,
    version = 0,
    createdAt = new Date(),
    updatedAt = new Date(),
    deletedAt = null,
  }) {
    super(id, Number(version));

    if (!id) {
      throw new DomainInvariantError("Registration id is required.");
    }
    if (!conferenceId) {
      throw new DomainInvariantError("conferenceId is required.");
    }
    if (!userId) {
      throw new DomainInvariantError("userId is required.");
    }

    const normalizedTier = String(ticketTier ?? "").toUpperCase();

    if (!VALID_TIERS.has(normalizedTier)) {
      throw new DomainInvariantError(
        `Invalid ticket tier '${ticketTier}'.`
      );
    }

    if (!VALID_STATUSES.has(status)) {
      throw new DomainInvariantError(
        `Invalid registration status '${status}'.`
      );
    }

    // Identity is initialized by super(id) and exposed by Entity.id.
    this.conferenceId = conferenceId;
    this.userId = userId;
    this.ticketTier = normalizedTier;
    this.status = status;
    this.attendeeNotes = attendeeNotes;
    this.dietaryRequirements = dietaryRequirements;
    this.specialAssistance = specialAssistance;
    this.paymentId = paymentId;
    this.checkedInAt = checkedInAt ? new Date(checkedInAt) : null;
    this.cancelledAt = cancelledAt ? new Date(cancelledAt) : null;
    this.createdAt = new Date(createdAt);
    this.updatedAt = new Date(updatedAt);
    this.deletedAt = deletedAt ? new Date(deletedAt) : null;

    // Local event queue consumed by the transactional outbox.
    this._pendingDomainEvents = [];
  }

  static createPending(input) {
    return new Registration({
      ...input,
      ticketTier: input.ticketTier ?? input.ticketType,
      attendeeNotes: input.attendeeNotes ?? input.notes ?? null,
      status: "PENDING",
    });
  }

  pullDomainEvents() {
    const events = this._pendingDomainEvents;
    this._pendingDomainEvents = [];
    return events;
  }

  _recordDomainEvent(event) {
    this._pendingDomainEvents.push(event);
  }

  confirm(paymentId) {
    if (this.status !== "PENDING") {
      throw new DomainInvariantError(
        "Only pending registrations can be confirmed."
      );
    }

    if (!paymentId) {
      throw new DomainInvariantError(
        "paymentId is required to confirm a registration."
      );
    }

    this.status = "CONFIRMED";
    this.paymentId = paymentId;
    this.updatedAt = new Date();
  }

  cancel() {
    if (this.status === "CANCELLED") {
      throw new DomainInvariantError(
        "Registration is already cancelled."
      );
    }

    if (this.status === "CHECKED_IN") {
      throw new DomainInvariantError(
        "A checked-in registration cannot be cancelled."
      );
    }

    this.status = "CANCELLED";
    this.cancelledAt = new Date();
    this.updatedAt = this.cancelledAt;
  }

  checkIn() {
    if (this.status !== "CONFIRMED") {
      throw new DomainInvariantError(
        "Only confirmed registrations can check in."
      );
    }

    this.status = "CHECKED_IN";
    this.checkedInAt = new Date();
    this.updatedAt = this.checkedInAt;
  }

  updateDetails({
    ticketTier,
    attendeeNotes,
    dietaryRequirements,
    specialAssistance,
  } = {}) {
    let changed = false;

    if (ticketTier !== undefined) {
      const tier = String(ticketTier).toUpperCase();

      if (!VALID_TIERS.has(tier)) {
        throw new DomainInvariantError(
          `Invalid ticket tier '${ticketTier}'.`
        );
      }

      if (tier !== this.ticketTier) {
        this.ticketTier = tier;
        changed = true;
      }
    }

    for (const [key, value] of Object.entries({
      attendeeNotes,
      dietaryRequirements,
      specialAssistance,
    })) {
      if (value !== undefined && value !== this[key]) {
        this[key] = value;
        changed = true;
      }
    }

    if (changed) {
      this.updatedAt = new Date();
    }

    return changed;
  }

  updateNotes(notes) {
    return this.updateDetails({ attendeeNotes: notes });
  }

  isCheckedIn() {
    return this.status === "CHECKED_IN";
  }

  isDeleted() {
    return this.deletedAt !== null;
  }

  markDeleted() {
    this.deletedAt = new Date();
    this.updatedAt = this.deletedAt;
  }

  toPersistence() {
    return {
      id: this.id,
      conference_id: this.conferenceId,
      user_id: this.userId,
      ticket_tier: this.ticketTier,
      status: this.status,
      attendee_notes: this.attendeeNotes,
      dietary_requirements: this.dietaryRequirements,
      special_assistance: this.specialAssistance,
      payment_id: this.paymentId,
      checked_in_at: this.checkedInAt,
      cancelled_at: this.cancelledAt,
      version: this.version,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      deleted_at: this.deletedAt,
    };
  }

  toJSON() {
    return {
      id: this.id,
      conferenceId: this.conferenceId,
      userId: this.userId,
      ticketTier: this.ticketTier,
      status: this.status,
      attendeeNotes: this.attendeeNotes,
      dietaryRequirements: this.dietaryRequirements,
      specialAssistance: this.specialAssistance,
      paymentId: this.paymentId,
      checkedInAt: this.checkedInAt,
      cancelledAt: this.cancelledAt,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}

