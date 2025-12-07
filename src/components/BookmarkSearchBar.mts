import BookmarkSearchResults from "./BookmarkSearchResults.mjs";

export default class BookmarkSearchBar extends HTMLInputElement {
  resultsContainerId: string;
  bookmarkSearchResults: HTMLElement | null;
  constructor(bookmarkSearchResultsId: string) {
    super();
    this.type = "text";
    this.id = "bookmark-search-bar";
    this.placeholder = "Search bookmarks...";
    this.resultsContainerId = bookmarkSearchResultsId;
    this.bookmarkSearchResults = document.getElementById(bookmarkSearchResultsId);
    
    this.addEventListener("input", () => {
      if (!this.bookmarkSearchResults)
        this.bookmarkSearchResults = document.getElementById(bookmarkSearchResultsId);
      const newBookmarkSearchResults = new BookmarkSearchResults();
      chrome.bookmarks.search(this.value, (results) => {
        results.forEach((result) => {
          if (!result.url) return; // skip folders
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = result.url!;
          a.textContent = result.title;
          li.appendChild(a);
          newBookmarkSearchResults.appendChild(li);
        })
      });
      this.bookmarkSearchResults!.replaceWith(newBookmarkSearchResults);
      this.bookmarkSearchResults = newBookmarkSearchResults;
    });
  }
}

customElements.define("bookmarks-search-bar", BookmarkSearchBar, { extends: "input" });
