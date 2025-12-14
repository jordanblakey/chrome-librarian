export default class BookmarkSearchBar extends HTMLInputElement {
  constructor() {
    super();
    this.type = "text";
    this.id = "bookmark-search-bar";
    this.placeholder = "Search bookmarks...";
  }

  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="../../assets/css/base.css">
      <link rel="stylesheet" href="../../assets/css/components.css">
    `;

    window.addEventListener('focus', () => this.focus());
    chrome.commands.onCommand.addListener(command => {
      if (command === 'search') {
        window.scrollTo({ top: 0 });
        this.focus();
      }
    });
  }
}

customElements.define("bookmarks-search-bar", BookmarkSearchBar, { extends: "input" });
