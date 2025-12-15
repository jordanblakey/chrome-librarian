import { faviconUrl } from "../utils/common.mjs";
import BookmarkSearchBar from "./BookmarkSearchBar.mjs";

export default class BookmarkChips extends HTMLElement {
  searchInput: BookmarkSearchBar | null = null;
  
  constructor() {
    super();
    this.id = "bookmark-chips";
  }

  connectedCallback() {
    this.searchInput = document.getElementById("bookmark-search-bar") as BookmarkSearchBar;
    
    if (this.searchInput && this.searchInput.inputElement) {
        this.searchInput.inputElement.addEventListener('input', async() => {
            if (this.searchInput && this.searchInput.value === "") { 
                await this.handleNullQuery();
                this.searchInput.setCount(0);
            } else if (this.searchInput) {
                this.searchBookmarkChips(this.searchInput.value)
            }
        });
    } else {
        console.error("BookmarkSearchBar not found or not ready");
    }

    this.handleNullQuery();
  }

  async handleNullQuery() {
    const tree = await chrome.bookmarks.getTree();
    const walk = await this.walkBookmarks(tree);
    const chips = walk
      .filter(node => node.node.url)
      .map(item => this.bookmarkTreeNodeToChip(item.node, item.path));
    this.replaceChildren(...chips);
    this.searchInput?.setCount(0); // Ensure count is hidden or reset
    if (this.searchInput && this.searchInput.inputElement) {
      this.searchInput.inputElement.placeholder = `Search ${chips.length} bookmarks...`;
    }
  }

  async searchBookmarkChips(query: string) {
    if (this.searchInput?.value === "") {
      await this.handleNullQuery();
      return;
    }
    const results = await chrome.bookmarks.search(query);
    
    // Resolve paths for all results in parallel
    const items = await Promise.all(
        results.map(async (node) => {
            const path = await this.getNodePath(node);
            return { node, path };
        })
    );

    const chips = items 
      .filter(item => item.node.url)
      .map(item => this.bookmarkTreeNodeToChip(item.node, item.path));
    
    this.replaceChildren(...chips);
    this.searchInput?.setCount(chips.length);
  }

  bookmarkTreeNodeToChip(node: chrome.bookmarks.BookmarkTreeNode, path: string) {
    const chip = document.createElement('a');
    chip.target = "_blank";
    const favicon = document.createElement('img');
    favicon.src = faviconUrl(node.url || '');
    chip.append(favicon);
    chip.classList.add('bookmark-chip');
    
    // "hovering bookmark chip shows title, full bookmark path, and url on 3 lines"
    // Use the folder path. If path is empty (root), it might just show title and url.
    chip.title = `${node.title}\n${path}\n${node.url}`;
    
    chip.setAttribute('href', node.url || '');
    const span = document.createElement('span')
    span.textContent = node.title;
    span.classList.add('chip-title');
    chip.appendChild(span);
    return chip;
  }

  async walkBookmarks(
    nodes: chrome.bookmarks.BookmarkTreeNode[],
    depth = 0,
    path = "",
    walk: { node: chrome.bookmarks.BookmarkTreeNode, depth: number, path: string }[] | null = null
  ) {
    if (walk === null) walk = [];
    for (const node of nodes) {
      // Don't include the folder name in its own path, but pass it down to children
      if (node.url) {
          // It's a bookmark
          walk.push({ node, depth, path });
      } else {
          // It's a folder
          // For root folders (depth 0), path is usually empty. 
          // If we want "Bookmarks Bar" to show up, we need to handle it.
          // The Chrome root structure: Root -> {Bookmarks Bar, Other Bookmarks}
          // Usually we want the visual path.
          
          let nextPath = path;
          if (node.title) {
              nextPath = path ? `${path} » ${node.title}` : node.title;
          }
           
          // We can also add folders to 'walk' if we wanted to show them, but handleNullQuery filters only .url nodes.
          if (node.children) {
            this.walkBookmarks(node.children, depth + 1, nextPath, walk);
          }
      }
    }
    return walk;
  }

  async getNodePath(node: chrome.bookmarks.BookmarkTreeNode): Promise<string> {
      if (!node.parentId) return "";
      
      try {
          // Root nodes have parentId '0' (implied root) but '0' itself is a node.
          // Generally we climb up until we hit a node with no parentId or specific root IDs.
          const parents = await chrome.bookmarks.get(node.parentId);
          if (parents && parents.length > 0) {
              const parent = parents[0];
              // Recursive step
              const grandParentPath = await this.getNodePath(parent);
              // Combine
              return grandParentPath ? `${grandParentPath} » ${parent.title}` : parent.title;
          }
      } catch (e) {
          // Parent might not exist or other error
          console.warn("Could not get parent for node", node.id, e);
      }
      return "";
  }
}

customElements.define("bookmark-chips", BookmarkChips);