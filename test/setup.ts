import { vi } from "vitest";

// Default stub returns specific data only if explicitly mocked in tests
vi.stubGlobal("chrome", {
  bookmarks: {
    // Return empty array by default to force tests to define their own data
    getTree: vi.fn(() => Promise.resolve([]))
  },
  runtime: {
    getURL: vi.fn(() => "chrome-extension://cfjmopenafkbgilpppcnfgajbkheaccn/")
  },
  downloads: {
    download: vi.fn()
  }
});
