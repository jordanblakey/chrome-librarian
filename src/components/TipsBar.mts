export default class TipsBar extends HTMLParagraphElement {
  constructor() {
    super();
    this.innerHTML = this.getRandomTip();
    this.initLink();
  }

  tips = [
    "Check the <b><a id=\"tip-link\" data-action=\"open-options-page\">options page</a></b> for a Prompt API demo.",
    "Press <b>Alt + S</b> to search your bookmark library anywhere.",
    "Experiment with <b>Session Type</b> dropdown to get different results.",
    "Restore your bookmarks from a point in time using <b>Snapshots</b>.",
    "Use the AI Classifier to <b>automatically categorize your bookmarks</b>."
  ]
  // ux: popup - add popup tips concerning classifier and snapshots


  getRandomTip() {
    return `Tip: ${this.tips[Math.floor(Math.random() * this.tips.length)]}`;
  }

  initLink() {
    this.querySelector("#tip-link")?.addEventListener("click", () => {
      const action = this.querySelector("#tip-link")?.getAttribute("data-action");
      if (action === "open-options-page") {
        chrome.runtime.openOptionsPage();
      }
    });
  }

}

customElements.define("options-page-link", TipsBar, { extends: "p" });