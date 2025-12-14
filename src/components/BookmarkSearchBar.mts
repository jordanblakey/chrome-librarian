export default class BookmarkSearchBar extends HTMLElement {
  inputElement: HTMLInputElement;
  countElement: HTMLElement;

  constructor() {
    super();
    this.id = "bookmark-search-bar";
    this.inputElement = document.createElement('input');
    this.inputElement.type = "text";
    this.inputElement.id = "bookmark-search-input";
    this.inputElement.placeholder = "Search bookmarks...";
    this.countElement = document.createElement('span');
    this.countElement.id = "search-count";
    this.countElement.classList.add('search-count', 'hidden');
  }

  connectedCallback() {
    this.innerHTML = `
      <link rel="stylesheet" href="../../assets/css/base.css">
      <link rel="stylesheet" href="../../assets/css/components.css">
    `;

    const container = document.createElement('div');
    container.classList.add('search-container');
    container.appendChild(this.inputElement);
    container.appendChild(this.countElement);
    this.appendChild(container);

    window.addEventListener('focus', () => this.inputElement.focus());
    chrome.commands.onCommand.addListener(command => {
      if (command === 'search') {
        window.scrollTo({ top: 0 });
        this.inputElement.focus();
      }
    });
  }

  get value() {
    return this.inputElement.value;
  }

  set value(val) {
    this.inputElement.value = val;
  }

  setCount(count: number) {
    if (this.value === "") {
        this.countElement.classList.add('hidden');
        return;
    }
    this.countElement.textContent = `${count} bookmarks found`;
    this.countElement.classList.remove('hidden');
  }
}

customElements.define("bookmarks-search-bar", BookmarkSearchBar);
