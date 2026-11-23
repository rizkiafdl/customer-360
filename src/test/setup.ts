import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom lacks browser APIs that Recharts (ResizeObserver), the shadcn sidebar
// (matchMedia), and cmdk (scrollIntoView) call. Node-environment tests have no
// window, so the stubs are only added under jsdom.
if (typeof window !== 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver ??= ResizeObserverStub
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
  Element.prototype.scrollIntoView ??= () => {}
}

afterEach(() => {
  cleanup()
})
