import TipsBar from "./components/TipsBar.mjs";
import BookmarkSearchBar from "./components/BookmarkSearchBar.mjs";
import BookmarkChips from "./components/BookmarkChips.mjs";

console.debug("[popup] script loaded...");

async function main() {
  initPageContent();
}

typeof window !== "undefined" && main();

export function initPageContent() {
  const controlBar = document.getElementById("control-bar");
  controlBar!.appendChild(new TipsBar())
  controlBar!.appendChild(new BookmarkSearchBar("bookmark-search-results"));

  const mainContent = document.getElementById("main-content");    
  mainContent!.appendChild(new BookmarkChips());

  const searchBar = document.getElementById("bookmark-search-bar");
  window.addEventListener('focus', () => searchBar!.focus());
  chrome.commands.onCommand.addListener(command => {
    if (command === 'search') {
      window.scrollTo({ top: 0 });
      searchBar!.focus();
    }
  });
}