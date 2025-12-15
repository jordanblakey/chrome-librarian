import { exportBookmarks } from "../utils/exportBookmarks.mjs";
import { storageOnChanged, toast } from "../utils/common.mjs";

export default class BookmarkManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <div class="bookmark-manager">
          <link rel="stylesheet" href="../../assets/css/base.css">
          <link rel="stylesheet" href="../../assets/css/components.css">
          
          <h2>Step 0: Snapshots & Backups</h2>
          <p>Save the current state of your bookmarks before organizing. Restore explicitly creates a *new* folder.</p>
          
          <div class="button-row" id="button-bar">
            <button id="create-snapshot">Create Snapshot</button>
            <button id="clear-snapshots" class="secondary">Clear All</button>
            <button id="export-bookmarks" class="secondary">Export Bookmarks</button>
          </div>
          
          <ul id="snapshots-list">
              <!-- Snapshots will appear here -->
          </ul>
      </div>
    `;
    chrome.storage.onChanged.addListener(storageOnChanged);
    this.listSnapshots();
    
    this.shadowRoot!.querySelector("#create-snapshot")!.addEventListener("click", this.createBookmarkSnapshot.bind(this));
    this.shadowRoot!.querySelector("#clear-snapshots")!.addEventListener("click", this.clearSnapshots.bind(this));
    this.shadowRoot!.querySelector("#export-bookmarks")!.addEventListener("click", exportBookmarks);
  }

  disconnectedCallback() {
    chrome.storage.onChanged.removeListener(storageOnChanged);
  }

  listSnapshots() {
    chrome.storage.local.get(null, (items) => {
      const snapshots = Object.entries(items)
        .filter(([key]) => key.startsWith("bookmarkSnapshot_"))
        .sort((a, b) => b[0].localeCompare(a[0])) // Sort newest first
        .sort((entry) => !(entry[1] as BookmarkSnapshot).isPinned ? 1 : -1)

      const listDiv = this.shadowRoot!.querySelector("#snapshots-list")!;
      listDiv.innerHTML = "";
      
      if (snapshots.length === 0) {
          listDiv.innerHTML = "<p class='text-muted'>No snapshots found</p>";
          return;
      }

      snapshots.forEach(([key, value]) => {
        // Parse metadata if available, or fallback
        let timestamp: number;
        let count = "Unknown";
        let statsHtml = "";

        // Handle migration/legacy format where value is just the array
        if (Array.isArray(value)) {
            timestamp = parseInt(key.replace("bookmarkSnapshot_", ""), 10);
        } else {
             // Future proof: if we start storing object wrapper
             timestamp = parseInt(key.replace("bookmarkSnapshot_", ""), 10);
        }
        
        // Analyze the tree for stats
        const bookmarkSnapshot = value as BookmarkSnapshot;
        const tree = bookmarkSnapshot.tree;
        const stats = bookmarkSnapshot.stats;

        const dateStr = new Date(timestamp).toLocaleString();

        const item = document.createElement("li");
        item.className = "snapshot-item";
        item.innerHTML = `
            <div class="snapshot-info ${bookmarkSnapshot.isPinned ? "pinned" : ""}">
                <span class="snapshot-label">
                  <span class="snapshot-date">${dateStr}</span>
                  ${bookmarkSnapshot.isPinned ? "<span class='snapshot-pinned'>[Pinned]</span>" : ""}
                </span>
                <span class="snapshot-meta">
                   ${stats.bookmarks} Bookmarks, ${stats.folders} Folders<br>
                   Avg Depth: ${stats.avgDepth.toFixed(1)} | Max Depth: ${stats.maxDepth} | Size: ${(JSON.stringify(tree).length / 1024).toFixed(1)} KB
                </span>
            </div>
            <div class="button-row">
                <button class="pin-btn">${bookmarkSnapshot.isPinned ? "Unpin" : "Pin"}</button>
                <button class="restore-btn">Restore</button>
                <button class="danger delete-btn">Delete</button>
            </div>
        `;
        
        item.querySelector(".pin-btn")!.addEventListener("click", () => this.pinSnapshot(key));
        item.querySelector(".restore-btn")!.addEventListener("click", () => this.restoreSnapshot(key, dateStr));
        item.querySelector(".delete-btn")!.addEventListener("click", () => this.deleteSnapshot(key));
        
        listDiv.appendChild(item);
      });
    });
  }

  async restoreSnapshot(key: string, dateLabel: string) {
    if (!confirm(`Restoring will create a NEW folder named "Restored - ${dateLabel}". Continue?`)) return;

    chrome.storage.local.get(key, (items) => {
      const bookmarkSnapshot = items[key] as BookmarkSnapshot;
      const tree = bookmarkSnapshot.tree;
      if (bookmarkSnapshot) {
          this.cloneBookmarks(tree, `Restored - ${dateLabel}`);
      } else {
          alert("Snapshot data missing!");
      }
    });
  }

  async pinSnapshot(key: string) {
    chrome.storage.local.get(key, (items) => {
      const bookmarkSnapshot = items[key] as BookmarkSnapshot;
      if (bookmarkSnapshot) {
          bookmarkSnapshot.isPinned = !bookmarkSnapshot.isPinned;
          chrome.storage.local.set({[key]: bookmarkSnapshot});
          this.listSnapshots();
      } else {
          alert("Snapshot data missing!");
      }
    });
  }
  
  async deleteSnapshot(key: string) {
      if (!confirm("Delete this snapshot permanently?")) return;
      await chrome.storage.local.remove(key);
      this.listSnapshots();
  }

  async clearSnapshots() {
    if (!confirm("Are you sure you want to delete ALL snapshots?")) return;
    
    await chrome.storage.local.get(null, async (items) => {
      const snapshots = Object.entries(items).filter(([key]) => key.startsWith("bookmarkSnapshot_"));
      for (const [key] of snapshots) {
        await chrome.storage.local.remove(key);
      }
      this.listSnapshots();
    });
  }

  async createBookmarkSnapshot() {
    const timestamp = Date.now();
    const key = `bookmarkSnapshot_${timestamp}`;
    const tree = await chrome.bookmarks.getTree();
    
    const bookmarkSnapshot: BookmarkSnapshot = {
      timestamp,
      isPinned: false,
      stats: this.analyzeTree(tree),
      tree,
    };

    await chrome.storage.local.set({[key]: bookmarkSnapshot});
    toast("Snapshot created!", "success");
    this.listSnapshots();
  }

  async cloneBookmarks(tree: chrome.bookmarks.BookmarkTreeNode[], folderName: string) {
    try {
        const restoreFolder = await chrome.bookmarks.create({
          title: folderName,
          parentId: "1", // '1' is typically Bookmarks Bar. '2' is Other Bookmarks. 
        });

        const queue: chrome.bookmarks.BookmarkTreeNode[] = [];
        // tree[0] is root. tree[0].children are top level folders.
        if (tree[0] && tree[0].children) {
            queue.push(...tree[0].children);
        }

        while (queue.length > 0) {
          const node = queue.shift()!;
          await this.createBookmark(node, restoreFolder.id);
        }
        
        toast(`Snapshost restored to folder: "${folderName}"`, "success");
        
    } catch (e) {
        console.error(e);
        toast("Error restoring snapshot. Check console.", "error");
    }
  }

  async createBookmark(node: chrome.bookmarks.BookmarkTreeNode, parentId: string) {
    // Only create bookmark/folder if it has a title (skipping root usually)
    // Actually, we want to recreate the folder structure.
    
    const clone: any = {
        parentId: parentId,
        title: node.title
    };
    
    if (node.url) {
        clone.url = node.url;
    }

    try {
        const newBookmark = await chrome.bookmarks.create(clone);
        
        if (node.children) {
          for (const child of node.children) {
            await this.createBookmark(child, newBookmark.id);
          }
        }
    } catch (err) {
        console.warn("Skipping node creation:", node.title, err);
    }
  }

  // Helper to analyze tree statistics
  analyzeTree(nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkSnapshotStats {
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
}

customElements.define("bookmark-manager", BookmarkManager);
