import { faviconUrl } from "../utils/common.mjs";
import BookmarkSearchBar from "./BookmarkSearchBar.mjs";

export default class BookmarkChips extends HTMLElement {
  searchInput: BookmarkSearchBar | null = null;
  isCtrlPressed: boolean = false;
  
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
    
    // listen for ctrl key to handle link opening behavior (prevent popup losing focus)
    window.addEventListener('keydown', (e) => e.key === 'Control' ? this.isCtrlPressed = true : null);
    window.addEventListener('keyup', (e) => e.key === 'Control' ? this.isCtrlPressed = false : null);

    this.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Add logic to focus first chip when pressing Down in search bar
    if (this.searchInput && this.searchInput.inputElement) {
        this.searchInput.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const chips = Array.from(this.children) as HTMLElement[];
                if (chips.length > 0) {
                    chips[0].focus();
                }
            }
        });
    }

    this.handleNullQuery();
  }

  handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('bookmark-chip')) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = target.nextElementSibling as HTMLElement;
      if (next) next.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = target.previousElementSibling as HTMLElement;
      if (prev) prev.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusNextRow(target, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusNextRow(target, -1);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== ' ') {
      this.searchInput?.inputElement?.focus();
    }
  }

  focusNextRow(current: HTMLElement, direction: 1 | -1) {
    const chips = Array.from(this.children) as HTMLElement[];
    const currentRect = current.getBoundingClientRect();
    const currentCenter = currentRect.left + currentRect.width / 2;
    const rowThreshold = 5;

    // Filter candidates strictly above or below
    const candidates = chips.filter(chip => {
        const rect = chip.getBoundingClientRect();
        if (direction === 1) {
            return rect.top >= currentRect.bottom - rowThreshold;
        } else {
            return rect.bottom <= currentRect.top + rowThreshold;
        }
    });

    if (candidates.length === 0) {
        if (direction === -1) {
             this.searchInput?.inputElement?.focus();
        }
        return;
    }

    // Group candidates by their vertical position (row)
    // Map Y-coord -> Chips[]
    const rows = new Map<number, HTMLElement[]>();
    
    for (const chip of candidates) {
       const rect = chip.getBoundingClientRect();
       const y = direction === 1 ? rect.top : rect.bottom; // use appropriate edge
       
       // Find an existing row key that is close enough
       let foundKey: number | null = null;
       for (const key of rows.keys()) {
           if (Math.abs(key - y) < rowThreshold) {
               foundKey = key;
               break;
           }
       }
       
       if (foundKey !== null) {
           rows.get(foundKey)?.push(chip);
       } else {
           rows.set(y, [chip]);
       }
    }

    // Sort row keys by distance from current chip
    const sortedKeys = Array.from(rows.keys()).sort((a, b) => {
         const distA = Math.abs(a - (direction === 1 ? currentRect.bottom : currentRect.top));
         const distB = Math.abs(b - (direction === 1 ? currentRect.bottom : currentRect.top));
         return distA - distB;
    });
    
    // Get the closest row
    const bestRow = rows.get(sortedKeys[0])!;
    
    // Find closest horizontal match in that row
    let bestMatch = bestRow[0];
    let minDist = Infinity;

    for (const chip of bestRow) {
        const rect = chip.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(center - currentCenter);
        if (dist < minDist) {
            minDist = dist;
            bestMatch = chip;
        }
    }

    bestMatch?.focus();
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
    
    // Fix for popup losing focus when when a link is clicked, and local urls not working
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      if (node.url) {
        chrome.tabs.create({ 
          url: node.url, 
          active: !this.isCtrlPressed
        });
      }
    });

    // Handle Space to open link, respecting Ctrl key (so active status is correct)
    chip.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            if (node.url) {
                chrome.tabs.create({
                    url: node.url,
                    active: !this.isCtrlPressed
                });
            }
        }
    });

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