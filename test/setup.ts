import { vi } from "vitest";

vi.stubGlobal("chrome", {
  bookmarks: {
    getTree: vi.fn(() => mockBookmarksResponse)
  },
  runtime: {
    getURL: vi.fn(() => "chrome-extension://cfjmopenafkbgilpppcnfgajbkheaccn/")
  } 
});

const mockBookmarksResponse: chrome.bookmarks.BookmarkTreeNode[] = [
    {
        "children": [
            {
                "children": [
                    {
                        "children": [
                            {
                                "dateAdded": 1764830579989,
                                "id": "13",
                                "index": 0,
                                "parentId": "27",
                                "syncing": false,
                                "title": "The Prompt API  |  AI on Chrome  |  Chrome for Developers",
                                "url": "https://developer.chrome.com/docs/ai/prompt-api"
                            },
                            {
                                "dateAdded": 1764862915795,
                                "id": "18",
                                "index": 1,
                                "parentId": "27",
                                "syncing": false,
                                "title": "chrome.bookmarks  |  API  |  Chrome for Developers",
                                "url": "https://developer.chrome.com/docs/extensions/reference/api/bookmarks#type-FolderType"
                            },

                        ],
                        "dateAdded": 1764935353407,
                        "dateGroupModified": 1765132718810,
                        "id": "27",
                        "index": 1,
                        "parentId": "1",
                        "syncing": false,
                        "title": "Docs"
                    },
                ],
                "dateAdded": 1764744850608,
                "dateGroupModified": 1765125867644,
                "folderType": "bookmarks-bar",
                "id": "1",
                "index": 0,
                "parentId": "0",
                "syncing": false,
                "title": "Bookmarks bar"
            },
            {
                "children": [],
                "dateAdded": 1764744850608,
                "dateGroupModified": 1764853372541,
                "folderType": "other",
                "id": "2",
                "index": 1,
                "parentId": "0",
                "syncing": false,
                "title": "Other bookmarks"
            }
        ],
        "dateAdded": 1765125544314,
        "id": "0",
        "syncing": false,
        "title": ""
    }
]