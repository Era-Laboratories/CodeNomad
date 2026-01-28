/**
 * Dev-mode test injection hooks.
 *
 * Exposes window.__TEST_INJECT__ in development builds only,
 * enabling Playwright E2E tests to inject mock data (e.g., approach
 * evaluation metadata, pipeline states) without requiring a running
 * Era Code backend.
 *
 * Production builds strip this module entirely via dead code elimination.
 */

export interface TestInjectionHooks {
  /** Emit a custom event that components can listen for */
  emitTestEvent: (eventName: string, detail: unknown) => void
  /** Store arbitrary test data accessible via getTestData */
  setTestData: (key: string, value: unknown) => void
  /** Retrieve stored test data */
  getTestData: (key: string) => unknown
}

const testDataStore = new Map<string, unknown>()

const hooks: TestInjectionHooks = {
  emitTestEvent(eventName: string, detail: unknown) {
    window.dispatchEvent(new CustomEvent(`test:${eventName}`, { detail }))
  },
  setTestData(key: string, value: unknown) {
    testDataStore.set(key, value)
  },
  getTestData(key: string) {
    return testDataStore.get(key)
  },
}

/**
 * Initialize test injection hooks.
 * Only runs in development mode; no-op in production.
 */
export function initTestInjection(): void {
  if (import.meta.env.DEV) {
    ;(window as any).__TEST_INJECT__ = hooks
  }
}
