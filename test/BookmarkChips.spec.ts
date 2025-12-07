import { describe, expect, test, vi } from "vitest";
import BookmarkChips from "../src/components/BookmarkChips.mts";

describe("BookmarkChips", () => {
    test("creates instance of BookmarkChips", () => {
        const bookmarkChips = new BookmarkChips();
        expect(bookmarkChips).toBeInstanceOf(BookmarkChips);
    });

    test("chrome.bookmarks.getTree mock returns tree", async () => {
      const prevCallCount = vi.mocked(chrome.bookmarks.getTree).mock.calls.length;
      const tree = await chrome.bookmarks.getTree()
      expect(chrome.bookmarks.getTree)
        .toHaveBeenCalledTimes(prevCallCount + 1);
      expect(tree).toHaveLength(1);
      expect(tree[0].children?.length).toBeGreaterThan(0);
    })

    test("it creates chips on initialization", async () => {
        const bookmarkChips = new BookmarkChips();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(bookmarkChips.children.length).toBeGreaterThan(0);
        expect(Array.from(bookmarkChips.children)
          .every(child => {
            return child.tagName === "A" && 
            child.getAttribute("href")
          })).toBe(true);
    })
});
  