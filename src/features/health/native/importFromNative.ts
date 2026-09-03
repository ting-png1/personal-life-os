import { importDailyHealthSummaries } from '../importBoundary.ts'
import {
  healthRepository,
  type IHealthRepository,
} from '../repository.ts'
import type {
  HealthNativeBridge,
  NativeHealthReadOptions,
  NativeHealthUnavailableReason,
} from './nativeBridge.ts'

export type NativeHealthImportResult =
  | Readonly<{
      status: 'imported'
      importedCount: number
    }>
  | Readonly<{
      status: 'unavailable'
      importedCount: 0
      reason: NativeHealthUnavailableReason
    }>

/**
 * Native 数据进入 LifeOS 的唯一编排入口：capability → unknown payload → Import Boundary → Repository。
 */
export async function importHealthFromNative(
  bridge: HealthNativeBridge,
  options: NativeHealthReadOptions,
  repository: IHealthRepository = healthRepository
): Promise<NativeHealthImportResult> {
  const capability = await bridge.getCapability()
  if (capability.status === 'unavailable') {
    return {
      status: 'unavailable',
      importedCount: 0,
      reason: capability.reason,
    }
  }

  const payload = await bridge.readDailySummaries(options)
  const summaries = await importDailyHealthSummaries(payload, repository)
  return { status: 'imported', importedCount: summaries.length }
}
