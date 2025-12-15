import { describe, expect, test, vi } from "vitest";
import BookmarkChips from "../src/components/BookmarkChips.mts";
import BookmarkSearchBar from "../src/components/BookmarkSearchBar.mts";

const mockBookmarksResponse: chrome.bookmarks.BookmarkTreeNode[] = [
    {
        id: '0',
        title: '',
        syncing: false,
        children: [
            {
                id: '1',
                title: 'Test Bookmark',
                url: 'https://example.com',
                parentId: '0',
                syncing: false
            }
        ]
    }
];

describe("BookmarkChips", () => {
    test("creates instance of BookmarkChips", () => {
      if (!customElements.get("bookmarks-search-bar")) {
          customElements.define("bookmarks-search-bar", BookmarkSearchBar);
      }
      const searchBar = new BookmarkSearchBar();
      document.body.appendChild(searchBar);
      
      const bookmarkChips = new BookmarkChips();
      expect(bookmarkChips).toBeInstanceOf(BookmarkChips);
      searchBar.remove();
    });

    test("chrome.bookmarks.getTree mock returns tree", async () => {
      chrome.bookmarks.getTree = vi.fn().mockResolvedValue(mockBookmarksResponse);
      const prevCallCount = vi.mocked(chrome.bookmarks.getTree).mock.calls.length;
      const tree = await chrome.bookmarks.getTree()
      expect(chrome.bookmarks.getTree)
        .toHaveBeenCalledTimes(prevCallCount + 1);
      expect(tree).toHaveLength(1);
      expect(tree[0].children?.length).toBeGreaterThan(0);
      expect(tree[0].children?.length).toBeGreaterThan(0);
    })

    test("updates search count when searching", async () => {
      if (!customElements.get("bookmarks-search-bar")) {
          customElements.define("bookmarks-search-bar", BookmarkSearchBar);
      }
      const searchBar = new BookmarkSearchBar();
      document.body.appendChild(searchBar);

      // Mock search results
      chrome.bookmarks.search = vi.fn().mockResolvedValue([
          { id: '1', title: 'Result 1', url: 'http://test1.com' },
          { id: '2', title: 'Result 2', url: 'http://test2.com' }
      ] as chrome.bookmarks.BookmarkTreeNode[]);

      const bookmarkChips = new BookmarkChips();
      document.body.appendChild(bookmarkChips);
      await new Promise(resolve => setTimeout(resolve, 0));

      searchBar.value = "test";
      searchBar.inputElement.dispatchEvent(new Event('input'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chrome.bookmarks.search).toHaveBeenCalledWith("test");
      expect(searchBar.countElement.textContent).toContain("2 bookmarks found");
      expect(searchBar.countElement.classList.contains("hidden")).toBe(false);

      searchBar.remove();
      bookmarkChips.remove();
    });

    test("it creates chips on initialization", async () => {
      if (!customElements.get("bookmarks-search-bar")) {
          customElements.define("bookmarks-search-bar", BookmarkSearchBar);
      }
      const searchBar = new BookmarkSearchBar();
      document.body.appendChild(searchBar);

      chrome.bookmarks.getTree = vi.fn().mockResolvedValue(mockBookmarksResponse);
      const bookmarkChips = new BookmarkChips();
      document.body.appendChild(bookmarkChips);
      await new Promise(resolve => setTimeout(resolve, 0));
      // Focus the inner input
      searchBar.inputElement.focus();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(bookmarkChips.children.length).toBeGreaterThan(0);
      expect(Array.from(bookmarkChips.children)
        .every(child => {
            return child.tagName === "A" && 
            child.getAttribute("href")
          })).toBe(true);
      
      // Verify placeholder
      expect(searchBar.inputElement.placeholder).toBe("Search 1 bookmarks...");

      searchBar.remove();
      bookmarkChips.remove();
    })

    test("getNodePath resolves folder path recursively", async () => {
        const bookmarkChips = new BookmarkChips();
        
        // Mock hierarchy: Root(0) -> Folder A(10) -> Folder B(11) -> Item(12)
        chrome.bookmarks.get = vi.fn()
            .mockResolvedValueOnce([{ id: '11', title: 'Folder B', parentId: '10' }]) // First call for Item's parent
            .mockResolvedValueOnce([{ id: '10', title: 'Folder A', parentId: '0' }])  // Second call for Folder B's parent
            .mockResolvedValueOnce([{ id: '0', title: '' }]);                         // Third call for Folder A's parent (root)

        const node = { id: '12', title: 'Item', parentId: '11', url: 'http://foo.com' } as chrome.bookmarks.BookmarkTreeNode;
        
        const path = await bookmarkChips.getNodePath(node);
        expect(path).toBe("Folder A » Folder B");
    });

    test("chips have 3-line tooltip with Title, Path, URL", async () => {
        const bookmarkChips = new BookmarkChips();
        const node = { title: "My Bookmark", url: "http://example.com" } as chrome.bookmarks.BookmarkTreeNode;
        const path = "Folder A » Folder B";

        const chip = bookmarkChips.bookmarkTreeNodeToChip(node, path);
        
        expect(chip.title).toBe("My Bookmark\nFolder A » Folder B\nhttp://example.com");
    });

    test("search results include resolved paths in tooltips", async () => {
        if (!customElements.get("bookmarks-search-bar")) {
            customElements.define("bookmarks-search-bar", BookmarkSearchBar);
        }
        const searchBar = new BookmarkSearchBar();
        document.body.appendChild(searchBar);
        const bookmarkChips = new BookmarkChips();
        document.body.appendChild(bookmarkChips);

        // search results
        chrome.bookmarks.search = vi.fn().mockResolvedValue([
            { id: '100', title: 'Found Item', url: 'http://found.com', parentId: '99' }
        ]);

        // path resolution calls
        chrome.bookmarks.get = vi.fn()
            .mockResolvedValueOnce([{ id: '99', title: 'Parent Folder', parentId: '0' }])
            .mockResolvedValueOnce([{ id: '0', title: '' }]);

        searchBar.value = "Found";
        searchBar.inputElement.dispatchEvent(new Event('input'));
        
        // Wait for async search and path resolution
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => setTimeout(resolve, 0)); // tick for recursive lookups

        const chip = bookmarkChips.querySelector('a');
        expect(chip).toBeTruthy();
        expect(chip?.title).toContain("Found Item");
        expect(chip?.title).toContain("Parent Folder");
        expect(chip?.title).toContain("http://found.com");
        
        searchBar.remove();
        bookmarkChips.remove();
    });
});
  