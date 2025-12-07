export default class OptionsPageLink extends HTMLParagraphElement {
  constructor() {
    super();
    this.innerHTML = "Check the <a id=\"options-link\">options page</a> for a Prompt API demo.";
    this.querySelector("#options-link")?.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }
}

customElements.define("options-page-link", OptionsPageLink, { extends: "p" });