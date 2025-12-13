import ExportBookmarksButton from "./BookmarkExporter.mjs";
import { storageOnChanged } from "../utils/common.mjs";

export default class BookmarkManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.shadowRoot!.innerHTML = `
<div class="bookmark-manager">
    <style>
        .bookmark-manager {
          background-color: #f0f0f0;
          padding: 4px;
          margin: 10px 0;
        }
    </style>
    <p><b>Bookmark Manager</b></p>
    <p>Manage versioned bookmark snapshots and export to html.</p>
    <div id="button-bar">
      <button id="create-snapshot">Create Snapshot (chrome.storage.local)</button>
      <button id="clear-snapshots">Clear Snapshots</button>
    </div>
    <div id="snapshots"></div>
</div>
    `;
    chrome.storage.onChanged.addListener(storageOnChanged);
    this.listSnapshots();
    this.shadowRoot!.querySelector("#create-snapshot")!.addEventListener("click", this.createBookmarkSnapshot.bind(this));
    this.shadowRoot!.querySelector("#clear-snapshots")!.addEventListener("click", this.clearSnapshots.bind(this));
    this.shadowRoot!.querySelector("#button-bar")!.prepend(new ExportBookmarksButton());
  }

  disconnectedCallback() {
    chrome.storage.onChanged.removeListener(storageOnChanged);
  }



  listSnapshots() {
    chrome.storage.local.get(null, (items) => {
      const snapshots = Object.entries(items).filter(([key]) => key.startsWith("bookmarkSnapshot_"));
      const snapshotsDiv = this.shadowRoot!.querySelector("#snapshots")!;
      snapshotsDiv.innerHTML = "";
      snapshots.forEach(([key, value]) => {
        const snapshotDiv = document.createElement("div");
        snapshotDiv.innerHTML = `<li>${key} <button>clone to bookmarks bar</button></li>`;
        snapshotDiv.querySelector("button")!.addEventListener("click", this.restoreSnapshot.bind(this, key));
        snapshotsDiv.appendChild(snapshotDiv);
      });
    });
  }

  async restoreSnapshot(key: string) {
    chrome.storage.local.get(key, (items: { [key: string]: chrome.bookmarks.BookmarkTreeNode[] }) => {
      const tree: chrome.bookmarks.BookmarkTreeNode[] = items[key]
      this.cloneBookmarks(tree)
    });
  }

  async clearSnapshots() {
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
    chrome.storage.local.set({[key]: await chrome.bookmarks.getTree()});
    this.listSnapshots();
  }

  async cloneBookmarks(tree: chrome.bookmarks.BookmarkTreeNode[]) {
    const cloneFolder = await chrome.bookmarks.create({
      title: "Cloned Bookmarks",
      parentId: "1",
    });

    const queue: chrome.bookmarks.BookmarkTreeNode[] = [];
    let currentParentId: string = cloneFolder.id;

    queue.push(...tree[0].children!);
    while (queue.length > 0) {
      const node = queue.shift()!;
      this.createBookmark(node, currentParentId);
    }
  }

  async createBookmark(node: chrome.bookmarks.BookmarkTreeNode, parentId: string) {
    const clone:any = {}
    clone.title = node.title;
    clone.parentId = parentId;
    if (node.url) {
      clone.url = node.url;
    }

    const newBookmark = await chrome.bookmarks.create(clone);
    if (node.children) {
      for (const child of node.children) {
        this.createBookmark(child, newBookmark.id);
      }
    }
  }
}

customElements.define("bookmark-manager", BookmarkManager);
