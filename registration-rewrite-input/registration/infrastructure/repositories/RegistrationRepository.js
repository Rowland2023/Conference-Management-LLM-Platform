export class RegistrationRepository {
  constructor(db) {
    this.db = db;
  }

  // Helper to resolve transaction or default db instance
  _getClient(tx) {
    return tx || this.db;
  }

  /**
   * Saves entity mutations back to storage.
   * Completely race-condition proof via explicit INSERT/UPDATE branching with strict OCC checks.
   */
  async save(registrationEntity, tx) {
    const client = this._getClient(tx);
    const payload = registrationEntity.toPersistence();
    const currentVersion = payload.version;

    // 1. Check if the record already exists in the database
    const existing = await client('registrations')
      .select('version')
      .where({ id: payload.id })
      .first();

    if (!existing) {
      try {
        // 2. Path A: Fresh Insertion (Persists initial baseline version payload)
        await client('registrations').insert(payload);
        
        // If your entity initializes with version 0 but the DB sets/expects 1, 
        // use: registrationEntity.version = 1;
        // If your entity initializes at 1 and maps 1 to the DB, no change is needed here, 
        // but explicit assignment ensures the memory state is locked in.
        registrationEntity.version = currentVersion; 
      } catch (error) {
        // Handle race conditions where two threads try to insert the same ID simultaneously
        if (error.code === '23505' || error.message?.includes('unique constraint')) {
          throw new Error("Concurrency Conflict: Registration already exists.");
        }
        throw error;
      }
    } else {
      // 3. Path B: Concurrent Update with isolated version matching
      const rowsAffected = await client('registrations')
        .where({ id: payload.id, version: currentVersion })
        .update({
          status: payload.status,
          ticket_tier: payload.ticket_tier,
          attendee_notes: payload.attendee_notes,
          payment_id: payload.payment_id,
          deleted_at: payload.deleted_at,
          updated_at: payload.updated_at,
          version: currentVersion + 1 
        });

      // Knex returns exactly the number of affected rows for updates across all SQL dialects
      if (rowsAffected === 0) {
        throw new Error(
          "Concurrency Conflict: The registration record was modified by another user process mid-flight. Please reload."
        );
      }

      // Sync internal model version tracker safely ONLY when an update has successfully advanced it in DB
      registrationEntity.version = currentVersion + 1;
    }
  }
}