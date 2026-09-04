import { type AppDatabase, db } from '../../../data/database.ts'
import { normalizeTodo } from '../../todo/normalization.ts'
import { generateId } from '../../../shared/lib/id.ts'
import { reconcileSyncState, maximumCounter, parseSyncOperation } from './reconciliation.ts'
import {
  bootstrapLocalFactsForSync,
  syncRuntimeTables,
  tableForDomain,
} from './localMutation.ts'
import type {
  RejectedSyncOperation,
  SyncCycleResult,
  SyncDomainRecord,
  SyncOperation,
  SyncOutboxEntry,
  SyncPullPage,
  SyncTransport,
} from './types.ts'

function operationFromOutbox(entry: SyncOutboxEntry): SyncOperation {
  return {
    protocolVersion: entry.protocolVersion,
    operationId: entry.operationId,
    deviceId: entry.deviceId,
    sequence: entry.sequence,
    domain: entry.domain,
    entityId: entry.entityId,
    kind: entry.kind,
    occurredAt: entry.occurredAt,
    record: entry.record,
    metadata: entry.metadata,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

function normalizeLocalRecord(record: SyncDomainRecord): SyncDomainRecord {
  if ('completed' in record && 'dueDate' in record) {
    return normalizeTodo(record)
  }
  return record
}

function rejectedOperation(
  transportId: string,
  page: SyncPullPage,
  index: number,
  input: unknown,
  code: RejectedSyncOperation['code'],
  detail: string,
  rejectedAt: string,
): RejectedSyncOperation {
  const operationId = typeof input === 'object' && input !== null && 'operationId' in input && typeof input.operationId === 'string'
    ? input.operationId
    : null
  return {
    rejectionId: `${transportId}/${page.nextCheckpoint}/${index}`,
    operationId,
    transportId,
    cursor: page.nextCheckpoint,
    code,
    detail,
    rejectedAt,
  }
}

export class SyncEngine {
  private readonly database: AppDatabase
  private readonly transport: SyncTransport
  private readonly now: () => string

  constructor(
    transport: SyncTransport,
    dependencies: { database?: AppDatabase; now?: () => string } = {},
  ) {
    this.transport = transport
    this.database = dependencies.database ?? db
    this.now = dependencies.now ?? (() => new Date().toISOString())
  }

  async pendingCount(): Promise<number> {
    return this.database.syncOutbox.where('status').equals('pending').count()
  }

  async pushPending(limit = 100): Promise<{ pushed: number; blocked: number }> {
    await bootstrapLocalFactsForSync(this.database, this.now())
    const entries = await this.database.syncOutbox
      .where('status')
      .equals('pending')
      .limit(limit)
      .toArray()
    if (entries.length === 0) return { pushed: 0, blocked: 0 }

    const attemptedAt = this.now()
    await this.database.transaction('rw', this.database.syncOutbox, async () => {
      for (const entry of entries) {
        await this.database.syncOutbox.update(entry.operationId, {
          attemptCount: entry.attemptCount + 1,
          lastAttemptAt: attemptedAt,
          lastErrorCode: null,
        })
      }
    })

    let results
    try {
      results = await this.transport.push(entries.map(operationFromOutbox))
    } catch (error) {
      const code = error instanceof Error && error.name ? error.name : 'transport-error'
      await this.database.transaction('rw', this.database.syncOutbox, async () => {
        for (const entry of entries) {
          await this.database.syncOutbox.update(entry.operationId, { lastErrorCode: code })
        }
      })
      throw error
    }

    const submitted = new Set(entries.map((entry) => entry.operationId))
    const seen = new Set<string>()
    for (const result of results) {
      if (!submitted.has(result.operationId) || seen.has(result.operationId)) {
        throw new Error('Sync transport returned an invalid or duplicate operation result')
      }
      seen.add(result.operationId)
    }

    let pushed = 0
    let blocked = 0
    await this.database.transaction('rw', this.database.syncOutbox, async () => {
      const byId = new Map(results.map((result) => [result.operationId, result]))
      for (const entry of entries) {
        const result = byId.get(entry.operationId)
        if (!result || result.status === 'retry') {
          await this.database.syncOutbox.update(entry.operationId, {
            lastErrorCode: result?.errorCode ?? 'incomplete-response',
          })
        } else if (result.status === 'accepted') {
          await this.database.syncOutbox.delete(entry.operationId)
          pushed += 1
        } else {
          await this.database.syncOutbox.update(entry.operationId, {
            status: 'blocked',
            lastErrorCode: result.errorCode ?? 'remote-rejected',
          })
          blocked += 1
        }
      }
    })
    return { pushed, blocked }
  }

  async applyPullPage(page: SyncPullPage): Promise<{ pulled: number; rejected: number }> {
    if (typeof page.nextCheckpoint !== 'string' || page.nextCheckpoint.trim() === '') {
      throw new Error('Sync pull page requires a non-empty nextCheckpoint')
    }
    const validated = page.operations.map((input, index) => {
      try {
        return { input, index, operation: parseSyncOperation(input), error: null }
      } catch (error) {
        return { input, index, operation: null, error }
      }
    })
    const appliedAt = this.now()
    let pulled = 0
    let rejected = 0
    const factTables = [
      this.database.todos,
      this.database.scheduleEvents,
      this.database.moodRecords,
      this.database.periodRecords,
      this.database.dailyHealthSummaries,
      this.database.continuityItems,
    ]

    await this.database.transaction(
      'rw',
      [...factTables, ...syncRuntimeTables(this.database)],
      async () => {
        for (const item of validated) {
          if (item.operation === null) {
            await this.database.syncRejectedOperations.put(
              rejectedOperation(
                this.transport.id,
                page,
                item.index,
                item.input,
                'invalid-operation',
                errorMessage(item.error),
                appliedAt,
              ),
            )
            rejected += 1
            continue
          }
          const operation = item.operation
          if (await this.database.syncAppliedOperations.get(operation.operationId)) continue
          const table = tableForDomain(this.database, operation.domain)
          const rawLocal = (await table.get(operation.entityId)) ?? null
          const localRecord = rawLocal === null ? null : normalizeLocalRecord(rawLocal)
          const localReplica = (await this.database.syncReplicas.get([
            operation.domain,
            operation.entityId,
          ])) ?? null
          let result
          try {
            result = reconcileSyncState({
              domain: operation.domain,
              entityId: operation.entityId,
              localRecord,
              localReplica,
              remote: operation,
              mergedAt: appliedAt,
            })
          } catch (error) {
            await this.database.syncRejectedOperations.put(
              rejectedOperation(
                this.transport.id,
                page,
                item.index,
                item.input,
                'reconciliation-failed',
                errorMessage(error),
                appliedAt,
              ),
            )
            rejected += 1
            continue
          }
          if (result.record === null) await table.delete(operation.entityId)
          else await table.put(result.record)
          await this.database.syncReplicas.put(result.replica)
          await this.database.syncAppliedOperations.add({
            operationId: operation.operationId,
            appliedAt,
          })
          const deviceState = await this.database.syncDeviceState.get('local')
          await this.database.syncDeviceState.put({
            id: 'local',
            deviceId: deviceState?.deviceId ?? generateId(),
            logicalCounter: Math.max(
              deviceState?.logicalCounter ?? 0,
              maximumCounter(operation),
            ),
            boundUserId: deviceState?.boundUserId ?? null,
          })
          pulled += 1
        }
        await this.database.syncCheckpoints.put({
          transportId: this.transport.id,
          cursor: page.nextCheckpoint,
          updatedAt: appliedAt,
        })
      },
    )
    return { pulled, rejected }
  }

  async pullNext(): Promise<{ pulled: number; rejected: number; hasMore: boolean; checkpoint: string }> {
    const checkpoint = await this.database.syncCheckpoints.get(this.transport.id)
    const page = await this.transport.pull(checkpoint?.cursor ?? null)
    const applied = await this.applyPullPage(page)
    return { ...applied, hasMore: page.hasMore, checkpoint: page.nextCheckpoint }
  }

  async runCycle(maxPullPages = 50): Promise<SyncCycleResult> {
    let pushed = 0
    let blocked = 0
    let pulled = 0
    let rejectedRemote = 0
    try {
      const push = await this.pushPending()
      pushed += push.pushed
      blocked += push.blocked
      let hasMore = true
      let pages = 0
      while (hasMore && pages < maxPullPages) {
        const pull = await this.pullNext()
        pulled += pull.pulled
        rejectedRemote += pull.rejected
        hasMore = pull.hasMore
        pages += 1
      }
      const checkpoint = await this.database.syncCheckpoints.get(this.transport.id)
      return {
        pushed,
        blocked,
        pulled,
        rejectedRemote,
        checkpoint: checkpoint?.cursor ?? null,
        complete: !hasMore,
        error: hasMore ? 'pull-page-limit' : null,
      }
    } catch (error) {
      const checkpoint = await this.database.syncCheckpoints.get(this.transport.id)
      return {
        pushed,
        blocked,
        pulled,
        rejectedRemote,
        checkpoint: checkpoint?.cursor ?? null,
        complete: false,
        error: errorMessage(error),
      }
    }
  }
}
