import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { resolveBottomSheetHeight } from './bottomSheetSizing.ts'

describe('resolveBottomSheetHeight', () => {
  it('恢复旧版 large/medium/auto 语义', () => {
    assert.equal(resolveBottomSheetHeight('large', 'max-h-[75vh]'), 'h-[85vh]')
    assert.equal(resolveBottomSheetHeight('medium', 'max-h-[75vh]'), 'h-[60vh]')
    assert.equal(resolveBottomSheetHeight('auto', 'max-h-[75vh]'), 'max-h-[85vh]')
  })

  it('未传 height 时使用 maxHeight，并保留自定义 class', () => {
    assert.equal(resolveBottomSheetHeight(undefined, 'max-h-[70vh]'), 'max-h-[70vh]')
    assert.equal(resolveBottomSheetHeight('h-[72vh]', 'max-h-[75vh]'), 'h-[72vh]')
  })

  it('iOS stable glass fallback 是静态且仅由显式 BottomSheet opt-in', () => {
    const css = readFileSync(
      new URL('../../styles/globals.css', import.meta.url),
      'utf8',
    )

    assert.match(css, /\.bottomsheet-container\.bottomsheet-ios-stable-glass/)
    assert.match(css, /background-color: rgba\(238, 233, 239, 0\.52\)/)
    assert.match(css, /-webkit-backdrop-filter: none/)
    assert.doesNotMatch(css, /data-render-phase|data-viewport-settling/)
  })
})
