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
      .filter(node => node[0].url)
      .map(node => this.bookmarkTreeNodeToChip(node[0]));
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
    const chips = results
      .filter(result => result.url)
      .map(result => this.bookmarkTreeNodeToChip(result));
    this.replaceChildren(...chips);
    this.searchInput?.setCount(chips.length);
  }

  bookmarkTreeNodeToChip(node: chrome.bookmarks.BookmarkTreeNode) {
    const chip = document.createElement('a');
    chip.target = "_blank";
    const favicon = document.createElement('img');
    favicon.src = faviconUrl(node.url || '');
    chip.append(favicon);
    chip.classList.add('bookmark-chip');
    chip.title = node.title;
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
    walk: [chrome.bookmarks.BookmarkTreeNode, number][] | null = null
  ) {
    if (walk === null) walk = [];
    for (const node of nodes) {
      walk.push([node, depth]);
      if (node.children) {
        this.walkBookmarks(node.children, depth + 1, walk);
      }
    }
    return walk;
  }
}

customElements.define("bookmark-chips", BookmarkChips);