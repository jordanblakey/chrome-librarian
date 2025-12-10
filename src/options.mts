import {ExportBookmarksButtonDemo} from "./components/BookmarkExporter.mjs";
import BookmarkManager from "./components/BookmarkManager.mjs";
import LanguageModelTester from "./components/LanguageModelTester.mjs";
import BookmarkTitleGeneratorDemo from "./components/BookmarkTitleGeneratorDemo.mjs";
console.debug("[options] script loaded...");

async function optionsMain() {
  document.body.appendChild(new BookmarkManager());
  document.body.appendChild(new ExportBookmarksButtonDemo());
  document.body.appendChild(new BookmarkTitleGeneratorDemo());
  document.body.appendChild(new LanguageModelTester());
}

typeof window !== "undefined" && optionsMain();
