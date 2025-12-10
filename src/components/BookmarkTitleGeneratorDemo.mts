export default class BookmarkTitleGeneratorDemo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `
<div class="bookmark-title-generator-demo">
    <style>
        .bookmark-title-generator-demo {
          background-color: #f0f0f0;
          padding: 4px;
          margin: 10px 0;
        }
    </style>
    <p><b>Bookmark Title Generator Demo</b></p>
    <p>Generate Bookmarks Titles from 5 random Wikipedia pages</p>
    <button>Generate</button>
    <div id="output"></div>
    <div id="summaries"></div>
</div>
        `;
  }

  connectedCallback() {
    this.shadowRoot!.querySelector("button")!.addEventListener("click", () => {
      this.generateBookmarkTitles();
    });
  }

  async generateBookmarkTitles() {
    let promises: Promise<string>[] = [];
    setTimeout(async () => {
      for (let i = 0; i < 5; i++) {
        const url = 'https://en.wikipedia.org/wiki/Special:Random/Wikipedia';
        this.summarizeUrl(url).then((response) => {
          const message: RuntimeMessagePrompt = {
            payload: response,
            type: "prompt",
            streaming: false,
          };
          chrome.runtime.sendMessage(message);
        });
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

    const summaryParagraph = document.createElement("p");
    summaryParagraph.textContent = summary;
    this.shadowRoot!.querySelector("#summaries")!.appendChild(summaryParagraph);

    console.debug("[summarizeUrl] summary length:", summary.length);
    console.debug("[summarizeUrl] summary:\n" + summary);
    return summary;
  }

}

customElements.define("bookmark-title-generator-demo", BookmarkTitleGeneratorDemo);



