import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // 在创建正式 App Store target 前需由 native milestone 最终确认该 Bundle ID。
  appId: 'com.personal.lifeos',
  appName: 'LifeOS',
  webDir: 'dist',
}

export default config
