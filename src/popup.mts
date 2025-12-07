import TipsBar from "./components/TipsBar.mjs";
import BookmarkSearchBar from "./components/BookmarkSearchBar.mjs";
import BookmarkSearchResults from "./components/BookmarkSearchResults.mjs";
import ToggleButton from "./components/ToggleButton.mjs";
import BookmarkChips from "./components/BookmarkChips.mjs";

console.debug("[popup] script loaded...");

async function main() {
  initPageContent();
  window.addEventListener('focus', () => {
    document.getElementById("bookmark-search-bar")!.focus();
  });
}

typeof window !== "undefined" && main();

export function initPageContent() {
  const controlBar = document.getElementById("control-bar");
  controlBar!.appendChild(new TipsBar())
  controlBar!.appendChild(new BookmarkSearchBar("bookmark-search-results"));

  const mainContent = document.getElementById("main-content");    
  mainContent!.appendChild(new BookmarkSearchResults());
  mainContent!.appendChild(new ToggleButton("bookmark-chips", "bookmark chips"));
  mainContent!.appendChild(new BookmarkChips());
}