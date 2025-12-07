import OptionsPageLink from "./components/OptionsPageLink.mjs";
import BookmarkSearchBar from "./components/BookmarkSearchBar.mjs";
import BookmarkSearchResults from "./components/BookmarkSearchResults.mjs";
import ToggleButton from "./components/ToggleButton.mjs";
import BookmarkChips from "./components/BookmarkChips.mjs";

console.debug("[popup] script loaded...");

async function main() {
  initPageContent();
}

typeof window !== "undefined" && main();

export function initPageContent() {
  const controlBar = document.getElementById("control-bar");
  controlBar!.appendChild(new OptionsPageLink())
  controlBar!.appendChild(new BookmarkSearchBar("bookmark-search-results"));

  const mainContent = document.getElementById("main-content");    
  mainContent!.appendChild(new BookmarkSearchResults());
  mainContent!.appendChild(new ToggleButton("bookmark-chips", "bookmark chips"));
  mainContent!.appendChild(new BookmarkChips());
}