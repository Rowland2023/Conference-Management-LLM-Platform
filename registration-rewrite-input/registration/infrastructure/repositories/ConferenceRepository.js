/**
 * @file ConferenceRepository.js
 * @description Repository abstraction for Conference aggregate persistence.
 */

export class ConferenceRepository {
  constructor({ db }) {
    this.db = db;
  }

  async findById(id) {
    const row = await this.db('conferences').where({ id }).first();
    if (!row) {
      return null;
    }
    return row;
  }

  async findByIdWithLock(id, transaction) {
    const query = this.db('conferences').where({ id });

    if (transaction) {
      query.transacting(transaction).forUpdate();
    }

    const row = await query.first();
    return row || null;
  }

  async save(conference, transaction = null) {
    const query = this.db('conferences');
    if (transaction) {
      query.transacting(transaction);
    }

    // Check if the conference already exists to decide between insert or update
    const existing = await this.db('conferences')
      .modify((q) => {
        if (transaction) q.transacting(transaction);
      })
      .where({ id: conference.id })
      .first();

    if (existing) {
      await query.where({ id: conference.id }).update({
        title: conference.title,
        description: conference.description,
        start_date: conference.startDate,
        end_date: conference.endDate,
        updated_at: new Date(),
      });
    } else {
      await query.insert({
        id: conference.id,
        title: conference.title,
        description: conference.description,
        start_date: conference.startDate,
        end_date: conference.endDate,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return conference;
  }
}