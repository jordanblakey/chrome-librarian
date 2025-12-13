import BookmarkManager from "./components/BookmarkManager.mjs";
import BookmarkClassifier from "./components/BookmarkClassifier.mjs";

console.debug("[options] script loaded...");

async function optionsMain() {
  const container = document.body;

  // Tab Header
  const tabContainer = document.createElement("div");
  tabContainer.className = "tab-container";

  const btnClassifier = document.createElement("button");
  btnClassifier.className = "tab-button active";
  btnClassifier.textContent = "AI Classifier";
  
  const btnSnapshots = document.createElement("button");
  btnSnapshots.className = "tab-button";
  btnSnapshots.textContent = "Snapshots & Backups";

  tabContainer.appendChild(btnClassifier);
  tabContainer.appendChild(btnSnapshots);
  container.appendChild(tabContainer);

  // Content Area
  const contentArea = document.createElement("div");
  contentArea.id = "content-area";
  container.appendChild(contentArea);

  // Components
  const classifierComponent = new BookmarkClassifier();
  const managerComponent = new BookmarkManager();

  // Switch Logic
  const switchTab = (tabName: 'classifier' | 'snapshots') => {
    contentArea.innerHTML = '';
    
    if (tabName === 'classifier') {
      contentArea.appendChild(classifierComponent);
      btnClassifier.classList.add("active");
      btnSnapshots.classList.remove("active");
    } else {
      contentArea.appendChild(managerComponent);
      // Trigger a refresh of the snapshot list when the tab is opened
      if (typeof (managerComponent as any).listSnapshots === 'function') {
         (managerComponent as any).listSnapshots();
      }
      btnSnapshots.classList.add("active");
      btnClassifier.classList.remove("active");
    }
  };

  btnClassifier.addEventListener("click", () => switchTab('classifier'));
  btnSnapshots.addEventListener("click", () => switchTab('snapshots'));

  // Default Load
  switchTab('classifier');
}

typeof window !== "undefined" && optionsMain();
