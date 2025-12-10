export default class BookmarkManager extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
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
    <p>Manage your bookmarks</p>
</div>
    `;
  }
}

customElements.define("bookmark-manager", BookmarkManager);
