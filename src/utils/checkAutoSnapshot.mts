import { analyzeTree } from './treeUtils.mjs';

// Checks for recent automatic snapshots and creates one if needed.
// Maintains a limit of 3 automatic snapshots.
export async function checkAutoSnapshot() {
  console.debug("[checkAutoSnapshot] Checking/Creating automatic snapshot...");
  try {
    const items = await chrome.storage.local.get(null);
    const snapshotKeys = Object.keys(items).filter(key => key.startsWith("bookmarkSnapshot_"));
    const snapshots: { key: string; data: BookmarkSnapshot; }[] = [];

    for (const key of snapshotKeys) {
      const val = items[key];
      // Handle legacy array format by skipping, or valid objects
      if (!Array.isArray(val)) {
        // Type assertion is safe-ish here as we validated it's not an array
        snapshots.push({ key, data: val as BookmarkSnapshot });
      }
    }

    // Filter for autosaves
    const autoSnapshots = snapshots.filter(s => s.data.title && s.data.title.includes("Autosave"));

    // Sort: Newest first (descending timestamp)
    autoSnapshots.sort((a, b) => b.data.timestamp - a.data.timestamp);

    // Check if we need to create one
    if (autoSnapshots.length === 0 || (Date.now() - autoSnapshots[0].data.timestamp > 86400000)) {
      console.debug("[checkAutoSnapshot] Creating new Autosave snapshot.");
      const tree = await chrome.bookmarks.getTree();
      const timestamp = Date.now();
      const key = `bookmarkSnapshot_${timestamp}`;
      const currentStats = analyzeTree(tree);

      const newSnapshot: BookmarkSnapshot = {
        timestamp,
        isPinned: false, // Autosaves are likely not pinned by default
        title: "Autosave",
        stats: currentStats,
        tree: tree
      };

      await chrome.storage.local.set({ [key]: newSnapshot });

      // Add to list for cleanup logic
      autoSnapshots.unshift({ key, data: newSnapshot });
    } else {
      console.debug("[checkAutoSnapshot] Recent autosave exists. Skipping creation.");
    }

    // Cleanup if > 3
    if (autoSnapshots.length > 3) {
      console.debug(`[checkAutoSnapshot] Found ${autoSnapshots.length} autosaves. Cleaning up...`);
      // Keep first 3 (newest). Delete rest.
      const toDelete = autoSnapshots.slice(3);
      for (const s of toDelete) {
        await chrome.storage.local.remove(s.key);
        console.debug("[checkAutoSnapshot] Deleted old autosave:", s.key);
      }
    }

  } catch (error) {
    console.error("[checkAutoSnapshot] Error:", error);
  }
}
