export class Specification {
  constructor() {
    if (this.constructor === Specification) {
      throw new Error('Specification is an abstract base and cannot be instantiated directly.');
    }
  }

  /**
   * Evaluate the business rule against an in-memory object instance.
   * @param {any} candidate 
   * @returns {boolean}
   */
  isSatisfiedBy(candidate) {
    throw new Error('Method isSatisfiedBy() must be implemented');
  }

  /**
   * Logical AND composite operation
   * @param {Specification} other 
   * @returns {Specification}
   */
  and(other) {
    return new ConjunctionSpecification(this, other);
  }

  /**
   * Logical OR composite operation
   * @param {Specification} other 
   * @returns {Specification}
   */
  or(other) {
    return new DisjunctionSpecification(this, other);
  }

  /**
   * Logical NOT negation operation
   * @returns {Specification}
   */
  not() {
    return new NegationSpecification(this);
  }
}

class ConjunctionSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  
  isSatisfiedBy(candidate) {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class DisjunctionSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  
  isSatisfiedBy(candidate) {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NegationSpecification extends Specification {
  constructor(spec) {
    super();
    this.spec = spec;
  }
  
  isSatisfiedBy(candidate) {
    return !this.spec.isSatisfiedBy(candidate);
  }
}