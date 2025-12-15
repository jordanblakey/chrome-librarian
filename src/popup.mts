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
  setupNavigationLinks();
}

function setupNavigationLinks() {
  const linkClassifier = document.getElementById('link-classifier');
  const linkSnapshots = document.getElementById('link-snapshots');

  const openOptions = (hash: string) => {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`assets/html/options.html${hash}`)
    });
  };

  linkClassifier?.addEventListener('click', (e) => {
    e.preventDefault();
    openOptions('#classifier');
  });

  linkSnapshots?.addEventListener('click', (e) => {
      e.preventDefault();
      openOptions('#snapshots');
  });
}