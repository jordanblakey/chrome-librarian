export default class BookmarkSearchResults extends HTMLUListElement {
    constructor() {
        super();
        this.id = "bookmark-search-results";
        this.style.textWrap = "wrap";
        this.style.listStyle = "none";
        this.style.paddingInlineStart = "0";
    }
}

customElements.define("bookmark-search-results", BookmarkSearchResults, { extends: "ul" });    