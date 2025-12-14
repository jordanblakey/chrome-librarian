import TipsBar from "./components/TipsBar.mjs";
import BookmarkSearchBar from "./components/BookmarkSearchBar.mjs";
import BookmarkChips from "./components/BookmarkChips.mjs";

console.debug("[popup] script loaded...");

async function main() {
  initPageContent();
}

typeof window !== "undefined" && main();

export function initPageContent() {
  document.body.appendChild(new TipsBar())
  document.body.appendChild(new BookmarkSearchBar());
  document.body.appendChild(new BookmarkChips());
}