import { db, type AppDatabase } from '../../data/database.ts'
import { nowISO } from '../../shared/lib/date.ts'
import { generateId } from '../../shared/lib/id.ts'
import {
  recordLocalUpsertInTransaction,
  syncRuntimeTables,
} from '../sync/v1/localMutation.ts'
import type {
  ContinuityEvidence,
  ContinuityItem,
  LifeContinuityItem,
  RelationshipContinuityItem,
  ContinuityStatus,
  ContinuityType,
  CreateConfirmedContinuityInput,
  UpdateContinuityInput,
} from './types.ts'

export interface IContinuityRepository {
  getById(id: string): Promise<ContinuityItem | undefined>
  getByStatus(
    continuityType: ContinuityType,
    status: ContinuityStatus,
  ): Promise<ContinuityItem[]>
  getActiveLife(): Promise<LifeContinuityItem[]>
  getActiveRelationship(
    relationshipId: string,
  ): Promise<RelationshipContinuityItem[]>
  getLifecycleChain(id: string): Promise<ContinuityItem[]>
  createConfirmed(
    input: CreateConfirmedContinuityInput,
  ): Promise<ContinuityItem>
  update(id: string, input: UpdateContinuityInput): Promise<ContinuityItem>
  expire(id: string, reason?: string | null): Promise<ContinuityItem>
  supersede(
    id: string,
    replacement: CreateConfirmedContinuityInput,
  ): Promise<{ previous: ContinuityItem; replacement: ContinuityItem }>
}

export interface ContinuityRepositoryDependencies {
  now?: () => string
  generateId?: () => string
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim()
  if (normalized.length === 0) {
    throw new Error(`${field} must not be empty`)
  }
  return normalized
}

function optionalText(value: string | null): string | null {
  if (value === null) return null
  const normalized = value.trim()
  return normalized.length === 0 ? null : normalized
}

function normalizeEvidence(evidence: ContinuityEvidence): ContinuityEvidence {
  const note = optionalText(evidence.note)

  if (evidence.observedAt !== null && !Number.isFinite(Date.parse(evidence.observedAt))) {
    throw new Error('evidence.observedAt must be a valid timestamp or null')
  }

  if (evidence.kind === 'user-statement') {
    if (evidence.reference !== null) {
      throw new Error('user-statement evidence must not have a reference')
    }
    return { ...evidence, note }
  }

  return {
    ...evidence,
    reference: requiredText(evidence.reference, 'evidence.reference'),
    note,
  }
}

function normalizeInput(input: CreateConfirmedContinuityInput): {
  continuityType: ContinuityType
  relationshipId: string | null
  content: string
  evidence: ContinuityEvidence[]
} {
  if (input.evidence.length === 0) {
    throw new Error('Continuity requires at least one evidence item')
  }

  const relationshipId =
    input.continuityType === 'relationship'
      ? requiredText(input.relationshipId, 'relationshipId')
      : null

  if (
    input.continuityType === 'life' &&
    Object.prototype.hasOwnProperty.call(input, 'relationshipId')
  ) {
    throw new Error('Life Continuity must not have a relationshipId')
  }

  return {
    continuityType: input.continuityType,
    relationshipId,
    content: requiredText(input.content, 'content'),
    evidence: input.evidence.map(normalizeEvidence),
  }
}

function buildConfirmedItem(
  input: CreateConfirmedContinuityInput,
  id: string,
  at: string,
  supersedesId: string | null,
): ContinuityItem {
  const normalized = normalizeInput(input)
  const shared = {
    id,
    content: normalized.content,
    status: 'active' as const,
    confirmation: {
      method: 'manual' as const,
      confirmedAt: at,
    },
    evidence: normalized.evidence,
    lifecycle: [{ type: 'confirmed' as const, at }],
    supersedesId,
    supersededById: null,
    expiredAt: null,
    createdAt: at,
    updatedAt: at,
  }

  return normalized.continuityType === 'life'
    ? {
        ...shared,
        continuityType: 'life',
        relationshipId: null,
      }
    : {
        ...shared,
        continuityType: 'relationship',
        relationshipId: normalized.relationshipId!,
      }
}

function assertActive(item: ContinuityItem): void {
  if (item.status !== 'active') {
    throw new Error(`Continuity item is not active: ${item.id}`)
  }
}

function assertSameBoundary(
  existing: ContinuityItem,
  replacement: CreateConfirmedContinuityInput,
): void {
  if (existing.continuityType !== replacement.continuityType) {
    throw new Error('A replacement must keep the same Continuity type')
  }

  if (
    existing.continuityType === 'relationship' &&
    (replacement.continuityType !== 'relationship' ||
      existing.relationshipId !== replacement.relationshipId.trim())
  ) {
    throw new Error('A replacement must keep the same relationshipId')
  }
}

function sortNewestFirst(items: ContinuityItem[]): ContinuityItem[] {
  return items.sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
  )
}

export class DexieContinuityRepository implements IContinuityRepository {
  private readonly database: AppDatabase
  private readonly currentTimestamp: () => string
  private readonly createId: () => string

  constructor(
    database: AppDatabase = db,
    dependencies: ContinuityRepositoryDependencies = {},
  ) {
    this.database = database
    this.currentTimestamp = dependencies.now ?? nowISO
    this.createId = dependencies.generateId ?? generateId
  }

  async getById(id: string): Promise<ContinuityItem | undefined> {
    return this.database.continuityItems.get(id)
  }

  async getByStatus(
    continuityType: ContinuityType,
    status: ContinuityStatus,
  ): Promise<ContinuityItem[]> {
    const items = await this.database.continuityItems
      .where('[continuityType+status]')
      .equals([continuityType, status])
      .toArray()
    return sortNewestFirst(items)
  }

  async getActiveLife(): Promise<LifeContinuityItem[]> {
    const items = await this.getByStatus('life', 'active')
    return items as LifeContinuityItem[]
  }

  async getActiveRelationship(
    relationshipId: string,
  ): Promise<RelationshipContinuityItem[]> {
    const normalizedId = requiredText(relationshipId, 'relationshipId')
    const items = await this.database.continuityItems
      .where('[relationshipId+status]')
      .equals([normalizedId, 'active'])
      .toArray()
    return sortNewestFirst(items) as RelationshipContinuityItem[]
  }

  async getLifecycleChain(id: string): Promise<ContinuityItem[]> {
    return this.database.transaction(
      'r',
      this.database.continuityItems,
      async () => {
        const item = await this.database.continuityItems.get(id)
        if (!item) throw new Error(`Continuity item not found: ${id}`)

        const chain = [item]
        const seen = new Set([item.id])
        let cursor = item

        while (cursor.supersedesId !== null) {
          if (seen.has(cursor.supersedesId)) {
            throw new Error(`Continuity lifecycle cycle detected: ${id}`)
          }
          const previous = await this.database.continuityItems.get(
            cursor.supersedesId,
          )
          if (!previous) {
            throw new Error(`Continuity lifecycle link is missing: ${cursor.supersedesId}`)
          }
          seen.add(previous.id)
          chain.unshift(previous)
          cursor = previous
        }

        cursor = item
        while (cursor.supersededById !== null) {
          if (seen.has(cursor.supersededById)) {
            throw new Error(`Continuity lifecycle cycle detected: ${id}`)
          }
          const replacement = await this.database.continuityItems.get(
            cursor.supersededById,
          )
          if (!replacement) {
            throw new Error(
              `Continuity lifecycle link is missing: ${cursor.supersededById}`,
            )
          }
          seen.add(replacement.id)
          chain.push(replacement)
          cursor = replacement
        }

        return chain
      },
    )
  }

  async createConfirmed(
    input: CreateConfirmedContinuityInput,
  ): Promise<ContinuityItem> {
    const item = buildConfirmedItem(
      input,
      this.createId(),
      this.currentTimestamp(),
      null,
    )
    return this.database.transaction(
      'rw',
      [this.database.continuityItems, ...syncRuntimeTables(this.database)],
      async () => {
        await this.database.continuityItems.add(item)
        await recordLocalUpsertInTransaction(
          this.database,
          'continuity',
          null,
          item,
          item.createdAt,
        )
        return item
      },
    )
  }

  async update(
    id: string,
    input: UpdateContinuityInput,
  ): Promise<ContinuityItem> {
    return this.database.transaction(
      'rw',
      [this.database.continuityItems, ...syncRuntimeTables(this.database)],
      async () => {
        const existing = await this.database.continuityItems.get(id)
        if (!existing) throw new Error(`Continuity item not found: ${id}`)
        assertActive(existing)

        const at = this.currentTimestamp()
        const updated: ContinuityItem = {
          ...existing,
          content: requiredText(input.content, 'content'),
          updatedAt: at,
          lifecycle: [...existing.lifecycle, { type: 'updated', at }],
        }
        await this.database.continuityItems.put(updated)
        await recordLocalUpsertInTransaction(
          this.database,
          'continuity',
          existing,
          updated,
          at,
        )
        return updated
      },
    )
  }

  async expire(id: string, reason: string | null = null): Promise<ContinuityItem> {
    return this.database.transaction(
      'rw',
      [this.database.continuityItems, ...syncRuntimeTables(this.database)],
      async () => {
        const existing = await this.database.continuityItems.get(id)
        if (!existing) throw new Error(`Continuity item not found: ${id}`)
        assertActive(existing)

        const at = this.currentTimestamp()
        const normalizedReason = optionalText(reason)
        const expired: ContinuityItem = {
          ...existing,
          status: 'expired',
          expiredAt: at,
          updatedAt: at,
          lifecycle: [
            ...existing.lifecycle,
            { type: 'expired', at, reason: normalizedReason },
          ],
        }
        await this.database.continuityItems.put(expired)
        await recordLocalUpsertInTransaction(
          this.database,
          'continuity',
          existing,
          expired,
          at,
        )
        return expired
      },
    )
  }

  async supersede(
    id: string,
    replacementInput: CreateConfirmedContinuityInput,
  ): Promise<{ previous: ContinuityItem; replacement: ContinuityItem }> {
    return this.database.transaction(
      'rw',
      [this.database.continuityItems, ...syncRuntimeTables(this.database)],
      async () => {
        const existing = await this.database.continuityItems.get(id)
        if (!existing) throw new Error(`Continuity item not found: ${id}`)
        assertActive(existing)
        assertSameBoundary(existing, replacementInput)

        const at = this.currentTimestamp()
        const replacement = buildConfirmedItem(
          replacementInput,
          this.createId(),
          at,
          existing.id,
        )
        const previous: ContinuityItem = {
          ...existing,
          status: 'superseded',
          supersededById: replacement.id,
          updatedAt: at,
          lifecycle: [
            ...existing.lifecycle,
            { type: 'superseded', at, replacementId: replacement.id },
          ],
        }

        await this.database.continuityItems.add(replacement)
        await this.database.continuityItems.put(previous)
        await recordLocalUpsertInTransaction(
          this.database,
          'continuity',
          existing,
          previous,
          at,
        )
        await recordLocalUpsertInTransaction(
          this.database,
          'continuity',
          null,
          replacement,
          at,
        )
        return { previous, replacement }
      },
    )
  }
}

export const continuityRepository: IContinuityRepository =
  new DexieContinuityRepository()
