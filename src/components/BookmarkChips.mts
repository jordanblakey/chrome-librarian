import { faviconUrl } from "../utils/common.mjs";

export default class BookmarkChips extends HTMLElement {
  searchInput: HTMLInputElement;
  constructor() {
    super();
    this.id = "bookmark-chips";
    this.searchInput = document.getElementById("bookmark-search-bar") as HTMLInputElement;
    this.searchInput.addEventListener('input', async() => {
      if (this.searchInput.value === "") await this.handleNullQuery();
      this.searchBookmarkChips(this.searchInput.value)
    });
  }

  connectedCallback() {
    this.handleNullQuery();
  }

  async handleNullQuery() {
    const tree = await chrome.bookmarks.getTree();
    const walk = await this.walkBookmarks(tree);
    const chips = walk
      .filter(node => node[0].url)
      .map(node => this.bookmarkTreeNodeToChip(node[0]));
    this.replaceChildren(...chips);
  }

  async searchBookmarkChips(query: string) {
    if (this.searchInput.value === "") {
      await this.handleNullQuery();
      return;
    }
    const results = await chrome.bookmarks.search(query);
    const chips = results
      .filter(result => result.url)
      .map(result => this.bookmarkTreeNodeToChip(result));
    this.replaceChildren(...chips);
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