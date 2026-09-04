import type { SupabaseClient } from '@supabase/supabase-js'
import { parseSyncOperation } from './reconciliation.ts'
import type {
  SyncOperation,
  SyncPullPage,
  SyncPushResult,
  SyncTransport,
} from './types.ts'

const RELAY_TABLE = 'sync_relay_operations'
const RELAY_COLUMNS = [
  'relay_seq',
  'user_id',
  'operation_id',
  'protocol_version',
  'device_id',
  'device_sequence',
  'domain',
  'entity_id',
  'kind',
  'occurred_at',
  'record_payload',
  'sync_metadata',
  'received_at',
].join(',')

type UnknownRecord = Record<string, unknown>

export interface SupabaseRelayError {
  code: string | null
  message: string
}

export interface SupabaseRelayRow {
  user_id: string
  operation_id: string
  protocol_version: number
  device_id: string
  device_sequence: number
  domain: string
  entity_id: string
  kind: string
  occurred_at: string
  record_payload: unknown
  sync_metadata: unknown
}

export interface SupabaseRelayGateway {
  getAuthenticatedUser(): Promise<{
    userId: string | null
    error: SupabaseRelayError | null
  }>
  insert(row: SupabaseRelayRow): Promise<{ error: SupabaseRelayError | null }>
  selectAfter(input: {
    userId: string
    checkpoint: string
    limit: number
  }): Promise<{ data: unknown; error: SupabaseRelayError | null }>
}

function normalizeError(error: { code?: string; message: string } | null): SupabaseRelayError | null {
  return error === null ? null : { code: error.code ?? null, message: error.message }
}

class SupabaseSdkRelayGateway implements SupabaseRelayGateway {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async getAuthenticatedUser() {
    const { data, error } = await this.client.auth.getUser()
    return { userId: data.user?.id ?? null, error: normalizeError(error) }
  }

  async insert(row: SupabaseRelayRow) {
    const { error } = await this.client.from(RELAY_TABLE).insert(row)
    return { error: normalizeError(error) }
  }

  async selectAfter(input: { userId: string; checkpoint: string; limit: number }) {
    const { data, error } = await this.client
      .from(RELAY_TABLE)
      .select(RELAY_COLUMNS)
      .eq('user_id', input.userId)
      .gt('relay_seq', input.checkpoint)
      .order('relay_seq', { ascending: true })
      .limit(input.limit)
    return { data, error: normalizeError(error) }
  }
}

export class SupabaseSyncTransportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseSyncTransportError'
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SupabaseSyncTransportError(`${path}: expected non-empty string`)
  }
  return value
}

function timestamp(value: unknown, path: string): string {
  const result = text(value, path)
  if (!result.includes('T') || !Number.isFinite(Date.parse(result))) {
    throw new SupabaseSyncTransportError(`${path}: expected ISO timestamp`)
  }
  return result
}

function decimalCursor(value: string | null): string {
  if (value === null) return '0'
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new SupabaseSyncTransportError('checkpoint: expected non-negative relay_seq')
  }
  return value
}

function relaySequence(value: unknown, path: string): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new SupabaseSyncTransportError(`${path}: expected positive safe relay_seq`)
    }
    return String(value)
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value
  throw new SupabaseSyncTransportError(`${path}: expected positive relay_seq`)
}

function compareDecimal(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+(?=\d)/, '')
  const normalizedRight = right.replace(/^0+(?=\d)/, '')
  return normalizedLeft.length - normalizedRight.length || normalizedLeft.localeCompare(normalizedRight)
}

function operationToRow(userId: string, input: SyncOperation): SupabaseRelayRow {
  const operation = parseSyncOperation(input)
  return {
    user_id: userId,
    operation_id: operation.operationId,
    protocol_version: operation.protocolVersion,
    device_id: operation.deviceId,
    device_sequence: operation.sequence,
    domain: operation.domain,
    entity_id: operation.entityId,
    kind: operation.kind,
    occurred_at: operation.occurredAt,
    record_payload: operation.record,
    sync_metadata: operation.metadata,
  }
}

function rowToOperation(input: unknown, expectedUserId: string, path: string): {
  relaySequence: string
  operation: SyncOperation
} {
  if (!isRecord(input)) throw new SupabaseSyncTransportError(`${path}: expected relay row`)
  const userId = text(input.user_id, `${path}.user_id`)
  if (userId !== expectedUserId) {
    throw new SupabaseSyncTransportError(`${path}.user_id: cross-user relay row rejected`)
  }
  const sequence = relaySequence(input.relay_seq, `${path}.relay_seq`)
  timestamp(input.received_at, `${path}.received_at`)
  const operation = parseSyncOperation({
    protocolVersion: input.protocol_version,
    operationId: input.operation_id,
    deviceId: input.device_id,
    sequence: input.device_sequence,
    domain: input.domain,
    entityId: input.entity_id,
    kind: input.kind,
    occurredAt: input.occurred_at,
    record: input.record_payload,
    metadata: input.sync_metadata,
  })
  return { relaySequence: sequence, operation }
}

function operationIdFromUnknown(input: unknown, index: number): string {
  return isRecord(input) && typeof input.operationId === 'string'
    ? input.operationId
    : `invalid-operation-${index}`
}

function pushErrorStatus(error: SupabaseRelayError): SyncPushResult['status'] {
  if (error.code === '23505') return 'accepted'
  if (['23502', '23514', '22P02', '22003'].includes(error.code ?? '')) return 'rejected'
  return 'retry'
}

export interface SupabaseSyncTransportOptions {
  client?: SupabaseClient
  gateway?: SupabaseRelayGateway
  pageSize?: number
}

/** Supabase-specific code ends here; Domain and reconciliation use SyncTransport only. */
export class SupabaseSyncTransport implements SyncTransport {
  readonly id = 'supabase-sync-relay-v1'
  private readonly gateway: SupabaseRelayGateway
  private readonly pageSize: number
  private expectedUserId: string | null = null

  constructor(options: SupabaseSyncTransportOptions) {
    if ((options.client === undefined) === (options.gateway === undefined)) {
      throw new Error('SupabaseSyncTransport requires exactly one client or gateway')
    }
    const pageSize = options.pageSize ?? 100
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
      throw new Error('SupabaseSyncTransport pageSize must be between 1 and 500')
    }
    this.gateway = options.gateway ?? new SupabaseSdkRelayGateway(options.client!)
    this.pageSize = pageSize
  }

  async currentAuthenticatedUserId(): Promise<string> {
    let auth
    try {
      auth = await this.gateway.getAuthenticatedUser()
    } catch (error) {
      throw new SupabaseSyncTransportError(
        `Supabase auth unavailable: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    if (auth.error) throw new SupabaseSyncTransportError(`Supabase auth failed: ${auth.error.message}`)
    if (!auth.userId) throw new SupabaseSyncTransportError('Supabase user is not authenticated')
    return auth.userId
  }

  bindExpectedUser(userId: string): void {
    if (userId.trim() === '') throw new Error('Expected sync userId must not be empty')
    this.expectedUserId = userId
  }

  private async authenticatedUserId(): Promise<string> {
    const userId = await this.currentAuthenticatedUserId()
    if (this.expectedUserId !== null && userId !== this.expectedUserId) {
      throw new SupabaseSyncTransportError('Supabase account changed during sync')
    }
    return userId
  }

  async push(operations: SyncOperation[]): Promise<SyncPushResult[]> {
    let userId: string
    try {
      userId = await this.authenticatedUserId()
    } catch (error) {
      const code = error instanceof Error ? error.name : 'auth-unavailable'
      return operations.map((operation, index) => ({
        operationId: operationIdFromUnknown(operation, index),
        status: 'retry',
        errorCode: code,
      }))
    }

    const results: SyncPushResult[] = []
    for (const [index, input] of operations.entries()) {
      const id = operationIdFromUnknown(input, index)
      let row: SupabaseRelayRow
      try {
        row = operationToRow(userId, input)
      } catch (error) {
        results.push({ operationId: id, status: 'rejected', errorCode: 'invalid-operation' })
        continue
      }
      try {
        const { error } = await this.gateway.insert(row)
        if (error === null) {
          results.push({ operationId: id, status: 'accepted', errorCode: null })
        } else {
          const status = pushErrorStatus(error)
          results.push({
            operationId: id,
            status,
            errorCode: status === 'accepted' ? null : error.code ?? 'supabase-error',
          })
        }
      } catch (error) {
        results.push({
          operationId: id,
          status: 'retry',
          errorCode: error instanceof Error ? error.name : 'transport-error',
        })
      }
    }
    return results
  }

  async pull(checkpoint: string | null): Promise<SyncPullPage> {
    const userId = await this.authenticatedUserId()
    const cursor = decimalCursor(checkpoint)
    let response
    try {
      response = await this.gateway.selectAfter({
        userId,
        checkpoint: cursor,
        limit: this.pageSize + 1,
      })
    } catch (error) {
      throw new SupabaseSyncTransportError(
        `Supabase relay pull unavailable: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    if (response.error) {
      throw new SupabaseSyncTransportError(`Supabase relay pull failed: ${response.error.message}`)
    }
    if (!Array.isArray(response.data) || response.data.length > this.pageSize + 1) {
      throw new SupabaseSyncTransportError('Supabase relay returned malformed page data')
    }

    const parsed = response.data.map((row, index) =>
      rowToOperation(row, userId, `relay[${index}]`))
    let previous = cursor
    for (const item of parsed) {
      if (compareDecimal(item.relaySequence, previous) <= 0) {
        throw new SupabaseSyncTransportError('Supabase relay_seq ordering is not strictly increasing')
      }
      previous = item.relaySequence
    }
    const selected = parsed.slice(0, this.pageSize)
    return {
      operations: selected.map((item) => item.operation),
      nextCheckpoint: selected[selected.length - 1]?.relaySequence ?? cursor,
      hasMore: parsed.length > this.pageSize,
    }
  }
}
