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

    test("clicking a chip opens the URL in a new tab via chrome.tabs.create", async () => {
        const bookmarkChips = new BookmarkChips();
        const node = { title: "Click Me", url: "http://click.com" } as chrome.bookmarks.BookmarkTreeNode;
        const path = "Some Path";
        
        const chip = bookmarkChips.bookmarkTreeNodeToChip(node, path);
        
        // Simulate click
        chip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://click.com", active: true });
    });

    test("handles arrow navigation between chips", async () => {
        const bookmarkChips = new BookmarkChips();
        // Create simplified chips
        const createChip = () => {
            const a = document.createElement('a');
            a.classList.add('bookmark-chip');
            a.tabIndex = 0; // make focusable
            return a;
        };
        const chip1 = createChip();
        const chip2 = createChip();
        const chip3 = createChip();
        
        bookmarkChips.appendChild(chip1);
        bookmarkChips.appendChild(chip2);
        bookmarkChips.appendChild(chip3);
        
        document.body.appendChild(bookmarkChips);

        // Focus first, then ArrowRight
        chip1.focus();
        chip1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(chip2);

        // ArrowRight again
        chip2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(document.activeElement).toBe(chip3);

        // ArrowLeft
        chip3.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(document.activeElement).toBe(chip2);

        // ArrowUp from top row (mocking layout behavior difficult here without strict rect mocks, but default behavior is focus input)
        // Let's mock focusNextRow since it relies on layout, or mock getBoundingClientRect
        
        bookmarkChips.remove();
    });

    test("spacebar triggers click on chip", async () => {
        const bookmarkChips = new BookmarkChips();
        const node = { title: "Space Me", url: "http://space.com" } as chrome.bookmarks.BookmarkTreeNode;
        const chip = bookmarkChips.bookmarkTreeNodeToChip(node, "path");
        bookmarkChips.appendChild(chip);
        document.body.appendChild(bookmarkChips);

        chip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://space.com", active: true });

        // Test Ctrl+Space
        chip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', ctrlKey: true, bubbles: true }));
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "http://space.com", active: false });

        bookmarkChips.remove();
    });
    
    test("down arrow from search bar focuses first chip", async () => {
        if (!customElements.get("bookmarks-search-bar")) {
            customElements.define("bookmarks-search-bar", BookmarkSearchBar);
        }
        const searchBar = new BookmarkSearchBar();
        document.body.appendChild(searchBar);
        const bookmarkChips = new BookmarkChips();
        document.body.appendChild(bookmarkChips);

        // Mock data to ensure a chip exists
        chrome.bookmarks.getTree = vi.fn().mockResolvedValue([
            { id: '0', title: '', children: [{ id: '1', title: 'Target', url: 'http://a.com' }] }
        ] as any);
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const firstChip = bookmarkChips.querySelector('.bookmark-chip') as HTMLElement;
        expect(firstChip).toBeDefined();

        searchBar.inputElement.focus();
        searchBar.inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        
        expect(document.activeElement).toBe(firstChip);
        
        searchBar.remove();
        bookmarkChips.remove();
    });

    test("typing focuses search input", async () => {
        if (!customElements.get("bookmarks-search-bar")) {
            customElements.define("bookmarks-search-bar", BookmarkSearchBar);
        }
        const searchBar = new BookmarkSearchBar();
        document.body.appendChild(searchBar);
        const bookmarkChips = new BookmarkChips();
        document.body.appendChild(bookmarkChips);
        
        // Wait for init
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Check if searchInput is linked
        if (!bookmarkChips.searchInput) {
            throw new Error("searchInput not found on bookmarkChips");
        }

        // Create a focused element to type in
        const chip = document.createElement('a');
        chip.classList.add('bookmark-chip');
        chip.tabIndex = 0;
        document.body.appendChild(chip);
        chip.focus();
        
        // Simulating bubbling: the chip needs to be inside the bookmarkChips component to bubble to it?
        // Wait, in previous successful test runs (before I edited), it was working?
        // Ah, in previous runs "typing focuses search input" passed!
        // What changed?
        // I changed the test setup? 
        // "const chip = document.createElement('a'); ... document.body.appendChild(chip);"
        // The chip is NOT inside bookmarkChips!
        // BookmarkChips listener is on `this` (itself). 
        // If chip is in body, event bubbles to body, not bookmarkChips.
        // I must append chip to bookmarkChips.
        
        bookmarkChips.appendChild(chip);
        chip.focus();

        chip.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
        
        // Re-query input as it might have been replaced (though unlikely, best to be safe)
        const currentInput = searchBar.querySelector('input');
        expect(document.activeElement).toBe(currentInput);
        
        chip.remove();
        searchBar.remove();
        bookmarkChips.remove();
    });
});
  