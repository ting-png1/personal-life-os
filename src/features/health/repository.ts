import { db, type AppDatabase } from '../../data/database.ts'
import type { DailyHealthSummary } from './types.ts'
import { commitLocalUpsert } from '../sync/v1/localMutation.ts'

export interface IHealthRepository {
  getByDate(date: string): Promise<DailyHealthSummary | undefined>
  getByDateRange(startDate: string, endDate: string): Promise<DailyHealthSummary[]>
  upsert(summary: DailyHealthSummary): Promise<DailyHealthSummary>
}

export class DexieHealthRepository implements IHealthRepository {
  private readonly database: AppDatabase

  constructor(database: AppDatabase = db) {
    this.database = database
  }

  async getByDate(date: string): Promise<DailyHealthSummary | undefined> {
    return this.database.dailyHealthSummaries.get(date)
  }

  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<DailyHealthSummary[]> {
    if (startDate > endDate) {
      throw new Error('Health date range start must not be after end')
    }

    return this.database.dailyHealthSummaries
      .where('date')
      .between(startDate, endDate, true, true)
      .sortBy('date')
  }

  async upsert(summary: DailyHealthSummary): Promise<DailyHealthSummary> {
    await commitLocalUpsert(
      'health',
      summary,
      new Date().toISOString(),
      this.database,
    )
    return summary
  }
}

export const healthRepository: IHealthRepository = new DexieHealthRepository()
