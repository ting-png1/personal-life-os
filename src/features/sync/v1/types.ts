import type { ContinuityItem } from '../../continuity/types.ts'
import type { PeriodRecord } from '../../cycle/types.ts'
import type { DailyHealthSummary } from '../../health/types.ts'
import type { MoodRecord } from '../../mood/types.ts'
import type { ScheduleEvent } from '../../schedule/types.ts'
import type { Todo } from '../../todo/types.ts'

export const SYNC_PROTOCOL_VERSION = 1 as const

export type SyncDomain =
  | 'todo'
  | 'schedule'
  | 'mood'
  | 'cycle'
  | 'health'
  | 'continuity'

export type SyncDomainRecord =
  | Todo
  | ScheduleEvent
  | MoodRecord
  | PeriodRecord
  | DailyHealthSummary
  | ContinuityItem

export interface SyncLogicalStamp {
  counter: number
  deviceId: string
}

export interface TodoCompletionRegister {
  completed: boolean
  stamp: SyncLogicalStamp
}

export interface SyncReplicaMetadata {
  fieldVersions: Record<string, SyncLogicalStamp>
  todoCompletionDates: Record<string, TodoCompletionRegister> | null
  tombstone: SyncLogicalStamp | null
}

export interface SyncOperation {
  protocolVersion: typeof SYNC_PROTOCOL_VERSION
  operationId: string
  deviceId: string
  sequence: number
  domain: SyncDomain
  entityId: string
  kind: 'upsert' | 'delete'
  /** Diagnostic only; never used for conflict ordering. */
  occurredAt: string
  record: SyncDomainRecord | null
  metadata: SyncReplicaMetadata
}

export interface SyncOutboxEntry extends SyncOperation {
  status: 'pending' | 'blocked'
  attemptCount: number
  lastAttemptAt: string | null
  lastErrorCode: string | null
  createdAt: string
}

export interface SyncReplicaState extends SyncReplicaMetadata {
  domain: SyncDomain
  entityId: string
  deleted: boolean
  updatedAt: string
}

export interface SyncCheckpoint {
  transportId: string
  cursor: string | null
  updatedAt: string
}

export interface AppliedSyncOperation {
  operationId: string
  appliedAt: string
}

export interface RejectedSyncOperation {
  rejectionId: string
  operationId: string | null
  transportId: string
  cursor: string | null
  code: 'invalid-operation' | 'invalid-record' | 'reconciliation-failed'
  detail: string
  rejectedAt: string
}

export interface SyncDeviceState {
  id: 'local'
  deviceId: string
  logicalCounter: number
}

export interface SyncPushResult {
  operationId: string
  status: 'accepted' | 'retry' | 'rejected'
  errorCode: string | null
}

export interface SyncPullPage {
  operations: unknown[]
  nextCheckpoint: string
  hasMore: boolean
}

/** Supabase or any future relay implements only this protocol boundary. */
export interface SyncTransport {
  readonly id: string
  push(operations: SyncOperation[]): Promise<SyncPushResult[]>
  pull(checkpoint: string | null): Promise<SyncPullPage>
}

export interface SyncCycleResult {
  pushed: number
  blocked: number
  pulled: number
  rejectedRemote: number
  checkpoint: string | null
  complete: boolean
  error: string | null
}
