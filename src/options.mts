import ExportBookmarksButtonDemo from "./components/ExportBookmarksButtonDemo.mjs";
import BookmarkManager from "./components/BookmarkManager.mjs";
import LanguageModelTester from "./components/LanguageModelTester.mjs";
import BookmarkTitleGeneratorDemo from "./components/BookmarkTitleGeneratorDemo.mjs";
console.debug("[options] script loaded...");

async function optionsMain() {
  document.body.appendChild(new BookmarkManager());
  document.body.appendChild(new ExportBookmarksButtonDemo());
  document.body.appendChild(new LanguageModelTester());
  document.body.appendChild(new BookmarkTitleGeneratorDemo());
}

typeof window !== "undefined" && optionsMain();
