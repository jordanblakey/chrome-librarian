import { test, expect } from "vitest";

import { walkBookmarks, formatRow } from "../src/popup";

test("it walks the bookmark tree", () => {
  const walk = walkBookmarks(sampleBookmarkTree);
  expect(walk.length).toBe(3);
});

test("it formats bookmark nodes", () => {
  const node = sampleBookmarkTree[0].children?.[0].children?.[0];
  if (!node) throw new Error("Bookmark node not found in sample tree.");
  const formattedRow = formatRow(node, 2);
  expect(formattedRow.startsWith("<pre>")).toBe(true);
  expect(formattedRow.endsWith("</pre>")).toBe(true);
  expect(formattedRow).toContain(
    "    [bookmark] Google (https://www.google.com/)",
  );
});

test("it formats folder rows", () => {
  const node = sampleBookmarkTree[0].children?.[0];
  if (!node) throw new Error("Bookmark node not found in sample tree.");
  const formattedRow = formatRow(node, 2);
  expect(formattedRow.startsWith("<pre>")).toBe(true);
  expect(formattedRow.endsWith("</pre>")).toBe(true);
  expect(formattedRow).toContain(
    "[folder:bookmarks-bar] Bookmarks bar - modified: 12/3/2025",
  );
});

const sampleBookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
  {
    children: [
      {
        children: [
          {
            dateLastUsed: 1764753055456,
            id: "5",
            syncing: false,
            title: "Google",
            url: "https://www.google.com/",
          },
        ],
        dateGroupModified: 1764752192117,
        folderType: "bookmarks-bar",
        id: "1",
        syncing: false,
        title: "Bookmarks bar",
      },
    ],
    id: "0",
    syncing: false,
    title: "",
  },
];
