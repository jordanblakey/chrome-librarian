export default class BookmarkChips extends HTMLDivElement {
  constructor() {
    super();
    this.id = "bookmark-chips";
    this.createBookmarkChips();
    this.classList.add("hidden");
  }

  async createBookmarkChips() {
    const tree = await chrome.bookmarks.getTree();
    const walk = await this.walkBookmarks(tree);
    const bookmarks = walk.map(node => node[0]).filter(node => node.url).map(node => {
      const chip = document.createElement('a');
      chip.classList.add('bookmark-chip');
      chip.setAttribute('href', node.url || '');
      chip.innerText = node.title;
      return chip;
    });
    this.append(...bookmarks);
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