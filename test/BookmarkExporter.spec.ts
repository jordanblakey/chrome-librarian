import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recursiveBuild } from '../src/utils/exportBookmarks.mjs';

// Mock dependencies
vi.mock('../src/utils/common.mjs', () => ({
  faviconUrl: (url: string) => `favicon:${url}`,
  imgUrlToDataUrl: async (url: string) => `data:${url}`,
}));

// Mock Chrome API
const mockGetTree = vi.fn();
chrome.bookmarks.getTree = mockGetTree;

// Helper to normalize HTML for comparison
function normalizeHtml(html: string) {
  return html.replace(/\s+/g, ' ').trim();
}

describe('BookmarkExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // Call recursiveBuild directly
    const html = await recursiveBuild(mockTree[0].children as any);
    
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
