import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  // handlers.test.ts roda em ambiente node, sem Storage
  globalThis.localStorage?.clear()
  globalThis.sessionStorage?.clear()
})

// Radix Select/Dialog em jsdom: APIs de ponteiro e layout que o jsdom não tem
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
}
