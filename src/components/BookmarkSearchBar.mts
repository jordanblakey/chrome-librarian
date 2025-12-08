export default class BookmarkSearchBar extends HTMLInputElement {
  constructor(bookmarkSearchResultsId: string) {
    super();
    this.type = "text";
    this.id = "bookmark-search-bar";
    this.placeholder = "Search bookmarks...";
  }
}

customElements.define("bookmarks-search-bar", BookmarkSearchBar, { extends: "input" });
