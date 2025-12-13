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
  demosContainer.innerHTML = `<h2>Experimental Demos</h2><p>These components demonstrate raw LLM capabilities.</p>`;
  const lmDemo = new LanguageModelDemo();
  const titleDemo = new BookmarkTitleGeneratorDemo();
  demosContainer.appendChild(lmDemo);
  demosContainer.appendChild(document.createElement("hr"));
  demosContainer.appendChild(titleDemo);

  // Switch Logic
  const switchTab = (tabName: 'classifier' | 'snapshots' | 'demos') => {
    contentArea.innerHTML = '';
    
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
  };

  btnClassifier.addEventListener("click", () => switchTab('classifier'));
  btnSnapshots.addEventListener("click", () => switchTab('snapshots'));
  btnDemos.addEventListener("click", () => switchTab('demos'));

  // Default Load
  switchTab('classifier');
}

typeof window !== "undefined" && optionsMain();
