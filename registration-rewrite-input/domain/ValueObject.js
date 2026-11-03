import { dequal } from 'dequal';

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;

  // Fix: Capture standard string properties AND Symbol properties
  const propertyKeys = Reflect.ownKeys(obj);

  propertyKeys.forEach(key => {
    const value = obj[key];
    if (value && typeof value === 'object') deepFreeze(value);
  });
  
  return Object.freeze(obj);
}

export class ValueObject {
  /**
   * @param {Object} props - Immutable structural properties
   */
  constructor(props) {
    if (props === null || typeof props !== 'object') {
      throw new Error('ValueObject requires a valid object configuration for its properties');
    }
    
    // Seal properties recursively against structural drift
    this.props = deepFreeze({ ...props });
    Object.freeze(this);
  }

  /**
   * Compare equality structurally based purely on inner values
   * @param {ValueObject} [other]
   * @returns {boolean}
   */
  equals(other) {
    if (other === null || other === undefined) return false;
    if (this === other) return true; // Reference check optimization
    if (!(other instanceof this.constructor)) return false;
    
    return dequal(this.props, other.props);
  }

  toJSON() {
    return this.props;
  }

  /**
   * Kept as an explicit execution method to match the Entity baseline API pattern
   * @returns {string}
   */
  hashCode() {
    return JSON.stringify(this.props);
  }
}