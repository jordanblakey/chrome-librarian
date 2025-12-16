import { vi } from "vitest";

// Default stub returns specific data only if explicitly mocked in tests
vi.stubGlobal("chrome", {
  bookmarks: {
    // Return empty array by default to force tests to define their own data
    getTree: vi.fn(() => Promise.resolve([]))
  },
  runtime: {
    getURL: vi.fn((path) => `chrome-extension://cfjmopenafkbgilpppcnfgajbkheaccn/${path}`)
  },
  downloads: {
    download: vi.fn()
  },
  commands: {
    onCommand: {
      addListener: vi.fn()
    }
  },
  tabs: {
    create: vi.fn()
  },
  notifications: {
    create: vi.fn()
  }
});
