export default class ToggleButton extends HTMLButtonElement {
  targetId: string;
  targetElement: HTMLElement | null;
  displayText: string;
  constructor(targetId: string, displayText: string ="") {
    super();
    this.targetId = targetId;
    this.targetElement = document.getElementById(this.targetId);
    this.displayText = displayText;
    this.style.cursor = "pointer";
    if (!this.targetElement || this.targetElement.classList.contains("hidden")) {
      this.textContent = `show ${this.displayText}`;
    } else {
      this.textContent = `hide ${this.displayText}`;
    }
    this.addEventListener("click", this.click);
  }

  click() {
    this.targetElement = document.getElementById(this.targetId);
    if (this.targetElement?.classList.contains("hidden")) {
      this.targetElement.classList.remove("hidden");
      this.textContent = `hide ${this.displayText}`;
    } else {
      this.targetElement?.classList.add("hidden");
      this.textContent = `show ${this.displayText}`;
    }
  }
}

customElements.define("toggle-button", ToggleButton, { extends: "button" });
