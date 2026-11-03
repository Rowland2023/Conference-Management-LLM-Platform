import { AggregateRoot } from "../../../../shared/domain/AggregateRoot.js";
import { DomainInvariantError } from "../../../../shared/domain/error/DomainErrors.js";

const VALID_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "CHECKED_IN",
]);

export class Registration extends AggregateRoot {
  constructor({
    id,
    conferenceId,
    userId,
    ticketTier,
    status = "PENDING",
    attendeeNotes = null,
    paymentId = null,
    version = 0,
    createdAt = new Date(),
    updatedAt = new Date(),
    deletedAt = null,
  }) {
    super(id);

    if (!conferenceId) {
      throw new DomainInvariantError("conferenceId is required.");
    }

    if (!userId) {
      throw new DomainInvariantError("userId is required.");
    }

    if (!ticketTier) {
      throw new DomainInvariantError("ticketTier is required.");
    }

    if (!VALID_STATUSES.has(status)) {
      throw new DomainInvariantError(
        `Invalid registration status '${status}'.`
      );
    }

    this.id = id;
    this.conferenceId = conferenceId;
    this.userId = userId;
    this.ticketTier = ticketTier;
    this.status = status;
    this.attendeeNotes = attendeeNotes;
    this.paymentId = paymentId;

    this.version = version;

    this.createdAt = new Date(createdAt);
    this.updatedAt = new Date(updatedAt);
    this.deletedAt = deletedAt ? new Date(deletedAt) : null;
  }

  confirm(paymentId) {
    if (this.status !== "PENDING") {
      throw new DomainInvariantError(
        "Only pending registrations can be confirmed."
      );
    }

    this.status = "CONFIRMED";
    this.paymentId = paymentId;
    this.updatedAt = new Date();
  }

  cancel() {
    if (this.status === "CANCELLED") {
      throw new DomainInvariantError(
        "Registration already cancelled."
      );
    }

    if (this.status === "CHECKED_IN") {
      throw new DomainInvariantError(
        "Checked-in registrations cannot be cancelled."
      );
    }

    this.status = "CANCELLED";
    this.updatedAt = new Date();
  }

  checkIn() {
    if (this.status !== "CONFIRMED") {
      throw new DomainInvariantError(
        "Only confirmed registrations may check in."
      );
    }

    this.status = "CHECKED_IN";
    this.updatedAt = new Date();
  }

  updateNotes(notes) {
    this.attendeeNotes = notes;
    this.updatedAt = new Date();
  }

  markDeleted() {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  isDeleted() {
    return this.deletedAt !== null;
  }

  toJSON() {
    return {
      id: this.id,
      conferenceId: this.conferenceId,
      userId: this.userId,
      ticketTier: this.ticketTier,
      status: this.status,
      attendeeNotes: this.attendeeNotes,
      paymentId: this.paymentId,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}