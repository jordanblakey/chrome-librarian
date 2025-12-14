export class ToastMessage extends HTMLElement {
  static get observedAttributes() {
    return ["message", "type"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    setTimeout(() => this.remove(), 3000);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
        this.render();
    }
  }

  private render() {
    if (!this.shadowRoot) return;
    const message = this.getAttribute("message") || "";
    const type = this.getAttribute("type") || "info";

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="../css/components.css">
      <div class="toast ${type}">
        ${message}
      </div>
    `;
  }
}

customElements.define("toast-message", ToastMessage);
