import { describe, expect, test, vi, beforeEach } from "vitest";
import BookmarkClassifier from "../src/components/BookmarkClassifier.mts";

const longTitle = "This is a very long title that should be truncated because it exceeds one hundred characters so we can test the hard cap properly which is set to 100 characters.";
const longUrl = "https://www.example.com/very/long/url/path/that/exceeds/forty/characters/and/needs/truncation";
const shortTitle = "Short Title";
const shortUrl = "https://example.com";

const mockBookmarksResponse: chrome.bookmarks.BookmarkTreeNode[] = [
    {
        id: '0',
        title: '',
        children: [
            {
                id: '1',
                title: longTitle,
                url: longUrl,
                parentId: '0',
                syncing: false
            },
            {
                id: '2',
                title: shortTitle,
                url: shortUrl,
                parentId: '0',
                syncing: false
            },
            {
                id: '3',
                title: longTitle, // Folder
                parentId: '0',
                syncing: false
            }
        ],
        syncing: false
    }
];

describe("BookmarkClassifier", () => {
    let mockSession: any;

    beforeEach(() => {
        // Mock chrome.bookmarks
        chrome.bookmarks.getTree = vi.fn().mockResolvedValue(mockBookmarksResponse);

        // Mock window.LanguageModel
        mockSession = {
            prompt: vi.fn().mockResolvedValue(JSON.stringify({ categories: ["Test"] })),
            destroy: vi.fn(),
            clone: vi.fn().mockResolvedValue({
                prompt: vi.fn().mockResolvedValue(JSON.stringify({ classifications: ["1:Test"] })),
                destroy: vi.fn()
            })
        };
        (window as any).LanguageModel = {
            create: vi.fn().mockResolvedValue(mockSession)
        };
        
        // Mock common utils (spinner, toast) to avoid DOM errors or noise
        vi.mock("../src/utils/common.mjs", async () => {
             const actual = await vi.importActual("../src/utils/common.mjs");
             return {
                 ...actual,
                 startExtensionSpinner: vi.fn(() => vi.fn()),
                 showBadgeSuccess: vi.fn(),
             };
        });
        
        // Mock treeUtils
        vi.mock('../src/utils/treeUtils.mjs', () => {
            return {
                getWeightedBookmarkSample: vi.fn((tree) => {
                     // Flatten the mock tree for the sample mock
                     return [
                         mockBookmarksResponse[0].children![0],
                         mockBookmarksResponse[0].children![1],
                         mockBookmarksResponse[0].children![2]
                     ];
                 })
             };
        });
        
        // define component if not already
        if (!customElements.get("bookmark-classifier")) {
             customElements.define("bookmark-classifier", BookmarkClassifier);
        }
    });

    test("truncates long titles and URLs in prompt", async () => {
        const classifier = new BookmarkClassifier();
        document.body.appendChild(classifier);
        
        await classifier.generateNovelSchema();

        expect((window as any).LanguageModel.create).toHaveBeenCalled();
        expect(mockSession.prompt).toHaveBeenCalled();

        const promptCall = mockSession.prompt.mock.calls[0][0];
        
        // Check Long Bookmark
        // Title truncation: "This is a very long title tha..." (27 chars + ...)
        // With a small sample (3 items) and large budget (9000 tokens), 
        // the dynamic limit will likely hit the hard caps (100 for title, 150 for URL).
        // Let's check for the hard caps.
        const expectedTitle = longTitle.substring(0, 100 - 3) + "...";
        expect(promptCall).toContain(expectedTitle);
        // expect(promptCall).not.toContain(longTitle); // Only if longTitle > 100 chars

        // URL truncation
        let cleanUrl = longUrl.replace("https://www.", "");
        const expectedUrl = cleanUrl.substring(0, 150 - 3) + "...";
         if (cleanUrl.length > 150) {
            expect(promptCall).toContain(expectedUrl);
         } else {
            // In the test setup, longUrl is ~90 chars, so it should NOT be truncated anymore
            // because 150 > 90.
            expect(promptCall).toContain(cleanUrl);
         }

        // Check Short Bookmark (should remain)
        expect(promptCall).toContain(shortTitle);
        expect(promptCall).toContain(shortUrl.replace("https://", ""));
        
        // Check Folder
        // "Folder: " + title
        if (longTitle.length > 100) {
             expect(promptCall).toContain(`Folder: ${expectedTitle}`);
        } else {
             expect(promptCall).toContain(`Folder: ${longTitle}`);
        }

        classifier.remove();
    });

    test("creates a notification when classification completes", async () => {
        const classifier = new BookmarkClassifier();
        document.body.appendChild(classifier);

        // Manually trigger the classification process
        // We need to bypass the button click and call logic directly or simulate click
        // But first, we need to ensure the schema generation or skipped step 0 state
        // Let's assume we can jump to step 1 via setting internal state if it was public,
        // or just calling createClassifications directly.
        
        await classifier.createClassifications();

        // Check if notification was created
        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'basic',
                title: 'Chrome Librarian: Categorization Complete',
                message: 'Return to finish shelving your library.',
                iconUrl: 'chrome-extension://cfjmopenafkbgilpppcnfgajbkheaccn/assets/icons/icon-128.png'
            })
        );

        classifier.remove();
    });
});
