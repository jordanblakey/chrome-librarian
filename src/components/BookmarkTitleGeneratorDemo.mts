import { faviconUrl } from "../utils/common.mjs";
import { createLanguageModelSession } from "../utils/languageModelSession.mjs";

export default class BookmarkTitleGeneratorDemo extends HTMLElement {
  session: LanguageModel | undefined;
  controller: AbortController | undefined;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.shadowRoot!.innerHTML = `<div class="bookmark-title-generator-demo">
        <style>
            .bookmark-title-generator-demo {
              background-color: #f0f0f0;
              padding: 4px;
              margin: 10px 0;
            }
            .bookmark-title-generator-demo img {
              width: 16px;
              height: 16px;
              margin-right: 4px;
            }
        </style>
        <p><b>Bookmark Title Generator Demo</b></p>
        <p>Generate Bookmarks Titles from 5 random Wikipedia pages</p>
        <button id="generate-button">Generate</button>
        <button id="clear-button">Clear</button>
        <div id="output"></div>
    </div>`;
    this.shadowRoot!.querySelector("#generate-button")!.addEventListener("click", () => {
      this.generateBookmarkTitles();
    });
    this.shadowRoot!.querySelector("#clear-button")!.addEventListener("click", () => {
      this.clear();
    });

    const { session, controller } = await createLanguageModelSession(
      1, 1, ["en"], "text", "text", 
      [{ 
        role: "system", 
        content: "You are a bookmark title generator. Given the text of a webpage, say what it is in 5 words or less. Do not add punctuation or Markdown formatting." 
      }]);
    this.session = session;
    this.controller = controller;
  }

  clear() {
    this.shadowRoot!.querySelector("#output")!.replaceChildren();
  }

  async generateBookmarkTitles() {
    if (!this.session) return;
    setTimeout(async () => {
      for (let i = 0; i < 5; i++) {
        const url = 'https://en.wikipedia.org/wiki/Special:Random/Wikipedia';
        const summary = await this.summarizeUrl(url)
        const bookmarkTitle = await this.session?.prompt(summary);
        const bookmarkTitleParagraph = document.createElement("p");
        const bookmarkTitleParagraphBold = document.createElement("b");
        bookmarkTitleParagraphBold.textContent = bookmarkTitle;
        const favicon = document.createElement("img");
        favicon.src = faviconUrl(url);
        bookmarkTitleParagraph.appendChild(favicon);
        bookmarkTitleParagraph.appendChild(bookmarkTitleParagraphBold);
        this.shadowRoot!.querySelector("#output")!.appendChild(bookmarkTitleParagraph );
        const summaryParagraph = document.createElement("p");
        summaryParagraph.textContent = summary;
        this.shadowRoot!.querySelector("#output")!.appendChild(summaryParagraph);
      }
    }, 1000);
  }

  async summarizeUrl(url: string): Promise<string> {
    console.debug("[summarizeUrl] url:", url);
    const response = await fetch(url)
      .then(response => response.text())
      .then(text => text)
      .catch(error => error);

    if (response instanceof Error) {
      console.debug("[summarizeUrl] error:", response);
      return "";
    }

    console.debug("[summarizeUrl] response length:", response.length);
    const html = response;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    var summary = "";
    const title = doc.querySelector("title")?.textContent?.trim();
    const description = doc.querySelector("meta[name='description']")?.getAttribute("content")?.trim() || "";
    const h1 = Array.from(doc.querySelectorAll("h1")).reduce((acc, h1) => acc + "\n" + h1.textContent?.trim(), "");
    const h2 = Array.from(doc.querySelectorAll("h2")).reduce((acc, h2) => acc + "\n" + h2.textContent?.trim(), "");
    const h3 = Array.from(doc.querySelectorAll("h3")).reduce((acc, h3) => acc + "\n" + h3.textContent?.trim(), "");
    const pArray = Array.from(doc.querySelectorAll("p"));
    const p = pArray.slice(0, Math.min(5, pArray.length))
      .reduce((acc, p) => acc + "\n" + p.textContent, "").trim();
    summary += title + description + h1 + h2 + h3 + p;
    summary = summary.slice(0, Math.min(1000, summary.length));
    console.debug("[summarizeUrl] summary length:", summary.length);
    console.debug("[summarizeUrl] summary:\n" + summary);
    return summary;
  }

}

customElements.define("bookmark-title-generator-demo", BookmarkTitleGeneratorDemo);
