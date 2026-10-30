import '@testing-library/jest-dom/vitest'

/**
 * Node 25 ships its own `localStorage` global that shadows jsdom's Storage
 * implementation, leaving an object with no setItem/getItem/clear. Replace it
 * with a faithful in-memory Storage so tests get real behavior.
 *
 * Installed unconditionally rather than conditionally, so the tests behave
 * identically regardless of Node or jsdom version.
 */
class MemoryStorage implements Storage {
  private entries = new Map<string, string>()

  get length(): number {
    return this.entries.size
  }

  key(index: number): string | null {
    return Array.from(this.entries.keys())[index] ?? null
  }

  getItem(key: string): string | null {
    return this.entries.has(key) ? this.entries.get(key)! : null
  }

  setItem(key: string, value: string): void {
    this.entries.set(String(key), String(value))
  }

  removeItem(key: string): void {
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
