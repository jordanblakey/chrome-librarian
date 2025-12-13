import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookmarkExporter from './BookmarkExporter.mjs';

// Mock dependencies
vi.mock('../utils/common.mjs', () => ({
  faviconUrl: (url: string) => `favicon:${url}`,
  imgUrlToDataUrl: async (url: string) => `data:${url}`,
}));

// Mock Chrome API
// We rely on the global chrome mock from test/setup.ts but override getTree for specific tests
const mockGetTree = vi.fn();
// We need to update the global mock's getTree to use our local mock for these tests, or spy on it.
// Since setup.ts uses vi.fn(), we can just redirect it or re-assign.
chrome.bookmarks.getTree = mockGetTree;


// Helper to normalize HTML for comparison
function normalizeHtml(html: string) {
  return html.replace(/\s+/g, ' ').trim();
}

describe('BookmarkExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Define custom element if not defined (though JSDOM might handle it)
    if (!customElements.get('bookmark-exporter')) {
        customElements.define('bookmark-exporter', BookmarkExporter);
    }
  });

  it('preserves duplicate folders correctly', async () => {
    // Structure:
    // Root
    //   Children
    //     Folder A
    //       Item 1
    //     Folder A
    //       Item 2
    
    const mockTree = [{
      children: [
        {
          id: '1',
          title: 'Folder A',
          children: [
            { id: '11', title: 'Item 1', url: 'http://example.com/1', dateAdded: 1000000000 }
          ],
          dateAdded: 1000000000,
          dateGroupModified: 1000000000
        },
        {
          id: '2',
          title: 'Folder A',
          children: [
            { id: '22', title: 'Item 2', url: 'http://example.com/2', dateAdded: 1000000000 }
          ],
          dateAdded: 1000000000,
          dateGroupModified: 1000000000
        }
      ]
    }];

    mockGetTree.mockResolvedValue(mockTree);

    const exporter = new BookmarkExporter();
    // We access the internal method or use the public flow
    // recursiveBuild is what we want to test specifically, but it takes nodes.
    // Let's call createExportHTML which calls recursiveBuild with tree[0].children
    
    // We can access recursiveBuild directly if we cast or ignore TS
    const html = await exporter.recursiveBuild(mockTree[0].children as any);
    
    // Check structure
    const normalized = normalizeHtml(html);
    
    // Expected:
    // <DL><p>
    //   <DT><H3>Folder A</H3>
    //   <DL><p>
    //     <DT><A>Item 1</A>
    //   </DL><p>
    //   <DT><H3>Folder A</H3>
    //   <DL><p>
    //     <DT><A>Item 2</A>
    //   </DL><p>
    // </DL><p>

    expect(normalized).toContain('Folder A</H3>');
    expect(normalized).toContain('Folder A (2)</H3>');
    
    // Validate that we have distinct folder names
    const matchesA1 = normalized.match(/>Folder A<\/H3>/g);
    const matchesA2 = normalized.match(/>Folder A \(2\)<\/H3>/g);
    expect(matchesA1?.length).toBe(1);
    expect(matchesA2?.length).toBe(1);
  });
});
