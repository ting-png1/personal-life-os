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

  it('iOS BottomSheet 统一使用不采样底页的静态 Glass fallback', () => {
    const css = readFileSync(
      new URL('../../styles/globals.css', import.meta.url),
      'utf8',
    )
    const component = readFileSync(new URL('./BottomSheet.tsx', import.meta.url), 'utf8')

    assert.match(css, /@supports \(-webkit-touch-callout: none\)/)
    assert.match(css, /\.bottomsheet-container > \.glass-strong/)
    assert.match(css, /background-color: var\(--color-bg\)/)
    assert.match(css, /-webkit-backdrop-filter: none/)
    assert.doesNotMatch(css, /data-render-phase|data-viewport-settling/)
    assert.doesNotMatch(component, /iosStableGlassFallback|visualViewport|setTimeout/)
  })
})
