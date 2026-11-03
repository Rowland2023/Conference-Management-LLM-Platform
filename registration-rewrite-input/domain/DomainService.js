export class DomainService {
  constructor() {
    if (this.constructor === DomainService) {
      throw new Error('DomainService is an abstract base and cannot be instantiated directly.');
    }
  }

  /**
   * Enforces a standard operational context wrapper.
   * Allows domain services to record business explanations/traces 
   * without depending on technical infrastructure loggers.
   * 
   * @param {string} policyName - The name of the banking rule being validated
   * @param {Function} executionFn - The pure domain logic block to run
   * @returns {*} The result of the domain execution
   */
  executePolicy(policyName, executionFn) {
    try {
      // You could attach internal performance metric counters here 
      // or build a pure audit-trail object graph returned alongside data
      return executionFn();
    } catch (error) {
      // Wrap generic system errors into clear domain policy violations
      error.message = `[Policy Violation: ${policyName}] ${error.message}`;
      throw error;
    }
  }
}