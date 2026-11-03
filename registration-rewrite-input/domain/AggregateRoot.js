// src/shared/domain/AggregateRoot.js

import { Entity } from "./Entity.js";

export class AggregateRoot extends Entity {
  #domainEvents = [];

  constructor(props = {}) {
    super(props);
  }

  /**
   * Record a domain event.
   *
   * @protected
   * @param {DomainEvent} event
   */
  addDomainEvent(event) {
    if (!event) {
      throw new Error("Domain event is required.");
    }

    this.#domainEvents.push(event);
  }

  /**
   * Alias used by some teams.
   */
  record(event) {
    this.addDomainEvent(event);
  }

  /**
   * Returns a copy of pending events.
   */
  getDomainEvents() {
    return [...this.#domainEvents];
  }

  /**
   * Returns whether events exist.
   */
  hasDomainEvents() {
    return this.#domainEvents.length > 0;
  }

  /**
   * Returns all pending events and clears them.
   * Usually called by the Unit of Work after commit.
   */
  pullDomainEvents() {
    const events = [...this.#domainEvents];
    this.#domainEvents.length = 0;
    return events;
  }

  /**
   * Clears events without returning them.
   */
  clearDomainEvents() {
    this.#domainEvents.length = 0;
  }
}