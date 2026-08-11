class MemoryStorage implements Storage {
  #map = new Map<string, string>()

  get length() {
    return this.#map.size
  }

  clear() {
    this.#map.clear()
  }

  getItem(key: string) {
    return this.#map.has(key) ? this.#map.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.#map.set(key, String(value))
  }

  removeItem(key: string) {
    this.#map.delete(key)
  }

  key(index: number) {
    return [...this.#map.keys()][index] ?? null
  }
}

if (typeof globalThis.localStorage?.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  })
}
