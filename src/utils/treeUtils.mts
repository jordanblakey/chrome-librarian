
// Helper to analyze tree statistics
export function analyzeTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkSnapshotStats {
    let bookmarks = 0;
    let folders = 0;
    let maxDepth = 0;
    let totalBookmarkDepth = 0;

    const traverse = (node: chrome.bookmarks.BookmarkTreeNode, depth: number) => {
        // Adjust depth so Bookmarks Bar contents (depth 2) are depth 0.
        // Root (0) -> Bar (1) -> Content (2) => 0
        const relativeDepth = Math.max(0, depth - 2);

        if (relativeDepth > maxDepth) maxDepth = relativeDepth;

        if (node.url) {
            bookmarks++;
            totalBookmarkDepth += relativeDepth;
        } else {
            folders++;
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child, depth + 1);
            }
        }
    };

    // Start traversal for each top-level node (usually 'root')
    for (const node of nodes) {
        traverse(node, 0);
    }

    const avgDepth = bookmarks > 0 ? totalBookmarkDepth / bookmarks : 0;

    return { bookmarks, folders, maxDepth, avgDepth };
}

/**
 * Recursively retrieves all nodes of a specific type (bookmark or folder) from the tree.
 */
export function getNodes(nodes: chrome.bookmarks.BookmarkTreeNode[], type: "bookmark" | "folder"): chrome.bookmarks.BookmarkTreeNode[] {
    const list: chrome.bookmarks.BookmarkTreeNode[] = [];
    for (const node of nodes) {
        const isBookmark = !!node.url;
        // Folders are nodes without URL. 
        if ((type === "bookmark" && isBookmark) || (type === "folder" && !isBookmark)) {
            list.push(node);
        }
        if (node.children) {
            list.push(...getNodes(node.children, type));
        }
    }
    return list;
}

/**
 * Returns a random sample of `n` nodes of a specific type from the given tree.
 */
export function getRandomSample(nodes: chrome.bookmarks.BookmarkTreeNode[], n: number, type: "bookmark" | "folder"): chrome.bookmarks.BookmarkTreeNode[] {
    const allNodes = getNodes(nodes, type);
    
    // Shuffle using Fisher-Yates algorithm
    for (let i = allNodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNodes[i], allNodes[j]] = [allNodes[j], allNodes[i]];
    }
    
    return allNodes.slice(0, n);
}

/**
 * Returns a weighted random sample of `n` nodes from the tree.
 * Folders (nodes without URL) are given 2x weight compared to Bookmarks.
 */
export function getWeightedBookmarkSample(nodes: chrome.bookmarks.BookmarkTreeNode[], n: number): chrome.bookmarks.BookmarkTreeNode[] {
    const folders = getNodes(nodes, "folder");
    const bookmarks = getNodes(nodes, "bookmark");
    
    // Create a pool where each item has a weight
    // We can't use simple array duplication for large sets efficiently, so we use weighted selection.
    let pool = [
        ...folders.map(f => ({ node: f, weight: 2 })),
        ...bookmarks.map(b => ({ node: b, weight: 1 }))
    ];

    const result: chrome.bookmarks.BookmarkTreeNode[] = [];
    const count = Math.min(n, pool.length);

    for (let i = 0; i < count; i++) {
         const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
         let r = Math.random() * totalWeight;
         
         const index = pool.findIndex(item => {
             r -= item.weight;
             return r <= 0;
         });
         
         if (index !== -1) {
             result.push(pool[index].node);
             // Remove from pool to avoid duplicates
             pool.splice(index, 1);
         }
    }
    return result;
}
