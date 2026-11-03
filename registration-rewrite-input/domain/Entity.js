import { DomainValidationError } from './error/DomainErrors.js';
import { DomainEvent } from './DomainEvent.js'; // add this

export class Entity {
  #domainEvents = [];

  constructor(id, version = 0) {
    if (new.target === Entity) {
      throw new Error('Entity is abstract and cannot be instantiated directly');
    }
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new DomainValidationError('Entity must have a non-empty string ID');
    }
    if (!Number.isInteger(version) || version < 0) {
      throw new DomainValidationError('Entity version must be a non-negative integer');
    }

    Object.defineProperty(this, '_id', { 
      value: id.trim(), 
      writable: false, 
      enumerable: true,
      configurable: false 
    });
    
    Object.defineProperty(this, '_version', { 
      value: version, 
      writable: true,
      enumerable: true,
      configurable: false 
    });
  }

  get id() { return this._id; }
  get version() { return this._version; }

  recordEvent(event) {
    if (!event) return;
    if (!(event instanceof DomainEvent)) {
      throw new Error('recordEvent only accepts DomainEvent instances');
    }
    this.#domainEvents.push(event);
  }

  pullEvents() {
    const events = [...this.#domainEvents];
    this.#domainEvents = [];
    return Object.freeze(events);
  }

  incrementVersion() {
    this._version += 1;
    return this; // allow chaining
  }

  equals(other) {
    if (other === null || other === undefined) return false;
    if (!(other instanceof this.constructor)) return false;
    return this.id === other.id;
  }

  toString() {
    return `${this.constructor.name}(id=${this.id}, v=${this.version})`;
  }

  get [Symbol.toPrimitive]() {
    return (hint) => {
      if (hint === 'string') return this.id;
      if (hint === 'number') return NaN;
      return this.id;
    };
  }

  static getMapKey(entity) {
    if (!entity || !entity.id) return null;
    return `${entity.constructor.name}:${entity.id}`;
  }
}