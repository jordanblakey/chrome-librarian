export default class BookmarkChips extends HTMLDivElement {
  searchInput: HTMLInputElement;
  constructor() {
    super();
    this.id = "bookmark-chips";
    this.searchInput = document.getElementById("bookmark-search-bar") as HTMLInputElement;
    this.searchInput.addEventListener('input', () => {
      if (this.searchInput.value === "") return
      this.searchBookmarkChips(this.searchInput.value)
    });
    this.searchInput.addEventListener('focus', async () => {
      if (this.searchInput.value === "") await this.handleNullQuery();
    });
  }

  async handleNullQuery() {
    const tree = await chrome.bookmarks.getTree();
    const walk = await this.walkBookmarks(tree);
    this.innerHTML = "";
    walk.forEach(node => {
      if (!node[0].url) return;
      const chip = this.bookmarkTreeNodeToChip(node[0]);
      this.append(chip);
    });
  }

  async searchBookmarkChips(query: string) {
    if (this.searchInput.value === "") {
      await this.handleNullQuery();
      return;
    }
    this.innerHTML = "";
    const results = await chrome.bookmarks.search(query);
    results.forEach(result => {
      const chip = this.bookmarkTreeNodeToChip(result);
      this.append(chip);
    });
  }

  bookmarkTreeNodeToChip(node: chrome.bookmarks.BookmarkTreeNode) {
    const chip = document.createElement('a');
    chip.target = "_blank";
    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?domain=${node.url}&sz=32`;
    chip.append(favicon);
    chip.classList.add('bookmark-chip');
    chip.setAttribute('href', node.url || '');
    chip.innerHTML += node.title;
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

customElements.define("bookmark-chips", BookmarkChips, { extends: "div" });