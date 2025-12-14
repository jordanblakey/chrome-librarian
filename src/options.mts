import BookmarkManager from "./components/BookmarkManager.mjs";
import BookmarkClassifier from "./components/BookmarkClassifier.mjs";
import LanguageModelDemo from "./components/LanguageModelDemo.mjs";
import BookmarkTitleGeneratorDemo from "./components/BookmarkTitleGeneratorDemo.mjs";

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

  const btnDemos = document.createElement("button");
  btnDemos.className = "tab-button";
  btnDemos.textContent = "Demos";

  tabContainer.appendChild(btnClassifier);
  tabContainer.appendChild(btnSnapshots);
  tabContainer.appendChild(btnDemos);
  container.appendChild(tabContainer);

  // Content Area
  const contentArea = document.createElement("div");
  contentArea.id = "content-area";
  container.appendChild(contentArea);

  // Components
  // Use lazy instantiation or just keep them in memory?
  // Keeping them in memory is fine for this scale.
  const classifierComponent = new BookmarkClassifier();
  const managerComponent = new BookmarkManager();
  
  // Demos container
  const demosContainer = document.createElement("div");
  demosContainer.id = "demos-container";
  demosContainer.innerHTML = `<h2>Experimental Demos</h2><p>These components demonstrate raw LLM capabilities.</p>`;
  const lmDemo = new LanguageModelDemo();
  const titleDemo = new BookmarkTitleGeneratorDemo();
  demosContainer.appendChild(lmDemo);
  demosContainer.appendChild(titleDemo);

  // Switch Logic
  const switchTab = (tabName: 'classifier' | 'snapshots' | 'demos', updateHistory = true) => {
    if (!tabName) tabName = 'classifier'; // Default fallback

    contentArea.replaceChildren();
    
    // Reset buttons
    btnClassifier.classList.remove("active");
    btnSnapshots.classList.remove("active");
    btnDemos.classList.remove("active");

    if (tabName === 'classifier') {
      contentArea.appendChild(classifierComponent);
      btnClassifier.classList.add("active");
    } else if (tabName === 'snapshots') {
      contentArea.appendChild(managerComponent);
      if (typeof (managerComponent as any).listSnapshots === 'function') {
         (managerComponent as any).listSnapshots();
      }
      btnSnapshots.classList.add("active");
    } else if (tabName === 'demos') {
      contentArea.appendChild(demosContainer);
      btnDemos.classList.add("active");
    }

    if (updateHistory) {
      (window as any).history.pushState(tabName, "", `#${tabName}`);
    }
    console.debug("[options] switchTab", tabName);
  };

  btnClassifier.addEventListener("click", () => switchTab('classifier'));
  btnSnapshots.addEventListener("click", () => switchTab('snapshots'));
  btnDemos.addEventListener("click", () => switchTab('demos'));
  
  (window as any).addEventListener("popstate", (event: PopStateEvent) => {
    switchTab(event.state as 'classifier' | 'snapshots' | 'demos', false);
  });

  const initialTab = window.location.hash.slice(1) as 'classifier' | 'snapshots' | 'demos';
  if (initialTab) {
      switchTab(initialTab, false);
  } else {
      switchTab('classifier', true);
  }
}

typeof window !== "undefined" && optionsMain();
