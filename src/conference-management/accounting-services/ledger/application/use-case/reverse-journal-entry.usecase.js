import {
  ValidationError,
  NotFoundError,
  BusinessRuleViolationError,
} from "../../../../../shared/application/errors/ApplicationErrors.js";

export class ReverseJournalEntryUseCase {
  constructor({ journalEntryRepository, accountRepository, outboxRepository, unitOfWork, logger }) {
    this.journalEntryRepository = journalEntryRepository;
    this.accountRepository = accountRepository;
    this.outboxRepository = outboxRepository;
    this.unitOfWork = unitOfWork;
    this.logger = logger;
  }

  async execute({ originalEntryId, reversalReason, idempotencyKey, requestedBy, correlationId }) {
    this.validateInput({ originalEntryId, reversalReason, idempotencyKey });

    const duplicate = await this.findDuplicateRequest(idempotencyKey);
    if (duplicate) {
      return duplicate;
    }

    try {
      return await this.unitOfWork.execute(async (session) => {
        const originalEntry = await this.loadOriginalEntry({ originalEntryId, session });
        
        const accounts = await this.lockAccounts({ originalEntry, session });
        const expectedAccountCount = [...new Set(originalEntry.lines.map(l => l.accountId))].length;
        this.validateAccounts(accounts, expectedAccountCount);

        const reversedLines = this.buildReversalLines(originalEntry.lines);
        this.validateAccountingInvariant(reversedLines);

        const reversalEntryPayload = this.buildReversalPayload({
          originalEntry,
          reversedLines,
          reversalReason,
          idempotencyKey,
          requestedBy,
          correlationId,
        });

        const reversalEntry = await this.createReversalEntry({ reversalEntryPayload, session });

        await this.markOriginalAsReversed({
          originalEntryId,
          reversalEntryId: reversalEntry.id,
          session,
        });

        await this.publishReversalEvent({ reversalEntry, session });

        this.recordSuccess({ originalEntryId, reversalEntryId: reversalEntry.id, correlationId });

        return { ...reversalEntry, isDuplicate: false };
      });
    } catch (error) {
      const concurrent = await this.handleConcurrencyError({ error, idempotencyKey });
      if (concurrent) {
        return concurrent;
      }
      throw error;
    }
  }

  validateInput({ originalEntryId, reversalReason, idempotencyKey }) {
    if (!originalEntryId || typeof originalEntryId !== 'string') {
      throw new InvalidArgumentError('originalEntryId required');
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new InvalidArgumentError('idempotencyKey required');
    }
    if (!reversalReason || typeof reversalReason !== 'string') {
      throw new InvalidArgumentError('reversalReason required for audit');
    }
  }

  async findDuplicateRequest(idempotencyKey) {
    const existing = await this.journalEntryRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { ...existing, isDuplicate: true };
    }
    return null;
  }

  async loadOriginalEntry({ originalEntryId, session }) {
    const originalEntry = await this.journalEntryRepository.findByIdForUpdate(originalEntryId, { session });
    if (!originalEntry) {
      throw new NotFoundError(`Journal entry ${originalEntryId} not found`);
    }
    if (originalEntry.status === 'REVERSED') {
      throw new InvalidStateError(`Entry ${originalEntryId} already REVERSED`);
    }
    return originalEntry;
  }

  async lockAccounts({ originalEntry, session }) {
    const accountIds = [...new Set(originalEntry.lines.map(l => l.accountId))].sort();
    return await this.accountRepository.findAndLockByIds(accountIds, { session });
  }

  validateAccounts(accounts, expectedCount) {
    if (!accounts || accounts.length !== expectedCount) {
      throw new InvalidStateError('One or more accounts no longer exist');
    }
    for (const acc of accounts) {
      if (acc.status && acc.status !== 'ACTIVE') {
        throw new InvalidStateError(`Account ${acc.id} is ${acc.status}`);
      }
    }
  }

  buildReversalLines(lines) {
    return lines.map(line => {
      if (line.amountInMinorUnits == null) {
        throw new InvalidStateError('Line missing amountInMinorUnits');
      }
      return {
        accountId: line.accountId,
        amountInMinorUnits: line.amountInMinorUnits,
        direction: line.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        currency: line.currency,
      };
    });
  }

  validateAccountingInvariant(reversedLines) {
    const debits = reversedLines
      .filter(l => l.direction === 'DEBIT')
      .reduce((s, l) => s + BigInt(l.amountInMinorUnits), 0n);
    const credits = reversedLines
      .filter(l => l.direction === 'CREDIT')
      .reduce((s, l) => s + BigInt(l.amountInMinorUnits), 0n);
    
    if (debits !== credits) {
      throw new InvalidStateError(`Accounting invariant violation: Debit ${debits} != Credit ${credits}`);
    }
  }

  buildReversalPayload({ originalEntry, reversedLines, reversalReason, idempotencyKey, requestedBy, correlationId }) {
    return {
      idempotencyKey,
      correlationId: correlationId || originalEntry.correlationId,
      description: `Reversal of Entry #${originalEntry.id}: ${reversalReason}`,
      currency: originalEntry.currency,
      status: 'POSTED',
      postedAt: new Date(),
      metadata: {
        reversedEntryId: originalEntry.id,
        reversalReason,
        requestedBy: requestedBy || 'SYSTEM',
        originalIdempotencyKey: originalEntry.idempotencyKey,
      },
      lines: reversedLines,
    };
  }

  async createReversalEntry({ reversalEntryPayload, session }) {
    return await this.journalEntryRepository.create(reversalEntryPayload, { session });
  }

  async markOriginalAsReversed({ originalEntryId, reversalEntryId, session }) {
    await this.journalEntryRepository.updateStatus(
      originalEntryId, 'REVERSED', { reversalEntryId }, { session }
    );
  }

  async publishReversalEvent({ reversalEntry, session }) {
    await this.outboxRepository.create({
      aggregateType: 'JOURNAL_ENTRY',
      aggregateId: reversalEntry.id,
      eventType: 'JournalEntryReversed',
      payload: reversalEntry,
      correlationId: reversalEntry.correlationId,
      idempotencyKey: `outbox-${reversalEntry.id}`,
    }, { session });
  }

  recordSuccess({ originalEntryId, reversalEntryId, correlationId }) {
    this.logger?.info({ message: 'Journal reversed', originalEntryId, reversalEntryId, correlationId });
  }

  async handleConcurrencyError({ error, idempotencyKey }) {
    if (error.code === '23505' || error.name === 'UniqueConstraintError') {
      const concurrent = await this.journalEntryRepository.findByIdempotencyKey(idempotencyKey);
      if (concurrent) {
        return { ...concurrent, isDuplicate: true };
      }
    }
    return null;
  }
}