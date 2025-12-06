console.debug("[popup] script loaded...");

async function main() {
  await createBookmarksTree();
  initializeEventListeners();
}

typeof window !== "undefined" && main();

export function initializeEventListeners() {
  document.getElementById("options-link")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

export async function createBookmarksTree() {
  const treeElement = document.createElement("p");
  const tree = await chrome.bookmarks.getTree();
  for (const node of walkBookmarks(tree)) {
    treeElement.innerHTML += formatRow(node[0], node[1]);
  }
  document.body.appendChild(treeElement);
}

export function walkBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  depth = 0,
  walk: [chrome.bookmarks.BookmarkTreeNode, number][] | null = null,
) {
  if (walk === null) walk = [];
  for (const node of nodes) {
    walk.push([node, depth]);
    if (node.children) {
      walkBookmarks(node.children, depth + 1, walk);
    }
  }
  return walk;
}

export function formatRow(
  node: chrome.bookmarks.BookmarkTreeNode,
  depth: number,
): string {
  var row = "    ".repeat(depth);
  const folderType = node.folderType ? `:${node.folderType}` : "";
  node.children ? (row += `[folder${folderType}]`) : (row += "[bookmark]");
  row += ` ${node.title}`;
  node.url ? (row += ` (${node.url})`) : "";
  node.dateGroupModified
    ? (row += ` - modified: ${new Date(node.dateGroupModified).toLocaleDateString()}`)
    : "";
  node.dateLastUsed
    ? (row += ` - used: ${new Date(node.dateLastUsed).toLocaleDateString()}`)
    : "";
  node.syncing ? (row += ` ⇄`) : "";
  row = `<pre>${row}</pre>`;
  return row;
}
