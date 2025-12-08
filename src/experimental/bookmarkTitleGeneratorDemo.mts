import { optionsState } from "../options.mjs";

export async function bookmarkTitleGeneratorDemo() {
  let promises: Promise<string>[] = [];
  setTimeout(async () => {
    for (let i = 0; i < 5; i++) {
      const url = 'https://en.wikipedia.org/wiki/Special:Random/Wikipedia';
      summarizeUrl(url).then((response) => {
        const message: RuntimeMessagePrompt = {
          payload: response,
          type: "prompt",
          streaming: false,
        };
        optionsState.responseStatus!.innerHTML = "(thinking...)";
        chrome.runtime.sendMessage(message);
      });
    }
  }, 1000);
}

async function summarizeUrl(url: string): Promise<string> {
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
