import { Capacitor, registerPlugin } from '@capacitor/core'

export interface NativeHealthReadOptions {
  readonly startDate: string
  readonly endDate: string
}

export type NativeHealthUnavailableReason =
  | 'native-runtime-unavailable'
  | 'native-plugin-unavailable'
  | 'provider-unavailable'

export type NativeHealthCapability =
  | Readonly<{
      status: 'available'
      providerId: string
    }>
  | Readonly<{
      status: 'unavailable'
      reason: NativeHealthUnavailableReason
    }>

/**
 * Provider-neutral Web contract。原生 payload 保持 unknown，必须经过 Health Import Boundary。
 */
export interface HealthNativeBridge {
  getCapability(): Promise<NativeHealthCapability>
  readDailySummaries(options: NativeHealthReadOptions): Promise<unknown>
}

// 后续 Swift local plugin 必须以 LifeOSHealth 注册并实现这两个 provider-neutral 方法。
interface CapacitorHealthPlugin {
  getCapability(): Promise<unknown>
  readDailySummaries(options: NativeHealthReadOptions): Promise<unknown>
}

export const HEALTH_NATIVE_PLUGIN_NAME = 'LifeOSHealth'

const capacitorHealthPlugin = registerPlugin<CapacitorHealthPlugin>(
  HEALTH_NATIVE_PLUGIN_NAME
)

export class NativeHealthCapabilityUnavailableError extends Error {
  constructor() {
    super('Native Health capability is unavailable in this environment')
    this.name = 'NativeHealthCapabilityUnavailableError'
  }
}

function parseCapability(input: unknown): NativeHealthCapability {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Invalid native Health capability response')
  }
  const value = input as Record<string, unknown>
  if (
    value.status === 'available' &&
    typeof value.providerId === 'string' &&
    value.providerId.trim() !== ''
  ) {
    return { status: 'available', providerId: value.providerId }
  }
  if (value.status === 'unavailable') {
    return { status: 'unavailable', reason: 'provider-unavailable' }
  }
  throw new Error('Invalid native Health capability response')
}

/** 浏览器和 PWA 的显式降级实现；不把 unavailable 冒充为 no-data。 */
export class WebHealthNativeBridge implements HealthNativeBridge {
  async getCapability(): Promise<NativeHealthCapability> {
    return {
      status: 'unavailable',
      reason: 'native-runtime-unavailable',
    }
  }

  async readDailySummaries(_options: NativeHealthReadOptions): Promise<unknown> {
    throw new NativeHealthCapabilityUnavailableError()
  }
}

export class CapacitorHealthNativeBridge implements HealthNativeBridge {
  private readonly plugin: CapacitorHealthPlugin
  private readonly isPluginAvailable: () => boolean

  constructor(
    plugin: CapacitorHealthPlugin = capacitorHealthPlugin,
    isPluginAvailable: () => boolean = () =>
      Capacitor.isPluginAvailable(HEALTH_NATIVE_PLUGIN_NAME)
  ) {
    this.plugin = plugin
    this.isPluginAvailable = isPluginAvailable
  }

  async getCapability(): Promise<NativeHealthCapability> {
    if (!this.isPluginAvailable()) {
      return { status: 'unavailable', reason: 'native-plugin-unavailable' }
    }
    try {
      return parseCapability(await this.plugin.getCapability())
    } catch {
      return { status: 'unavailable', reason: 'native-plugin-unavailable' }
    }
  }

  async readDailySummaries(options: NativeHealthReadOptions): Promise<unknown> {
    if (!this.isPluginAvailable()) {
      throw new NativeHealthCapabilityUnavailableError()
    }
    return this.plugin.readDailySummaries(options)
  }
}

export function createHealthNativeBridge(): HealthNativeBridge {
  return Capacitor.isNativePlatform()
    ? new CapacitorHealthNativeBridge()
    : new WebHealthNativeBridge()
}
