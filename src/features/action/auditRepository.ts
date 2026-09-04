import { db, type AppDatabase } from '../../data/database.ts'
import type {
  ActionAuditEvent,
  ActionAuditRecord,
  ActionAuditUpdate,
  IActionAuditRepository,
} from './types.ts'

export class DexieActionAuditRepository implements IActionAuditRepository {
  private readonly database: AppDatabase

  constructor(database: AppDatabase = db) {
    this.database = database
  }

  async create(record: ActionAuditRecord): Promise<ActionAuditRecord> {
    await this.database.actionAuditRecords.add(record)
    return record
  }

  async appendEvent(
    executionId: string,
    event: ActionAuditEvent,
    update: ActionAuditUpdate,
  ): Promise<ActionAuditRecord> {
    if (event.type !== update.status) {
      throw new Error('Action audit event type must match record status')
    }
    return this.database.transaction(
      'rw',
      this.database.actionAuditRecords,
      async () => {
        const existing = await this.database.actionAuditRecords.get(executionId)
        if (!existing) {
          throw new Error(`Action audit record not found: ${executionId}`)
        }
        const updated: ActionAuditRecord = {
          ...existing,
          ...update,
          status: update.status,
          events: [...existing.events, event],
          updatedAt: event.at,
        }
        await this.database.actionAuditRecords.put(updated)
        return updated
      },
    )
  }

  getByExecutionId(executionId: string): Promise<ActionAuditRecord | undefined> {
    return this.database.actionAuditRecords.get(executionId)
  }

  async getByProposalId(proposalId: string): Promise<ActionAuditRecord[]> {
    return this.database.actionAuditRecords
      .where('proposalId')
      .equals(proposalId)
      .sortBy('createdAt')
  }
}

export const actionAuditRepository: IActionAuditRepository =
  new DexieActionAuditRepository()
