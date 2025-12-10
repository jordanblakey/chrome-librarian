export default class BookmarkExporter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.shadowRoot!.innerHTML = `<button>Export Bookmarks</button>`;
        this.shadowRoot!.querySelector("button")!.addEventListener("click", () => {
          this.exportBookmarks();
        });
    }

    async exportBookmarks() {    
        try {
            const exporter = new BookmarkExporter();
            const blob = await exporter.createExportHTML()
            const url = URL.createObjectURL(blob)
            const filename = `bookmarks_export_${new Date().toISOString().slice(0, 10)}.html`
            chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
            })
        } catch (error) {
            console.error("[exportBookmarks] error:", error)
        }
    }
    
    async createExportHTML() {
        const tree = await chrome.bookmarks.getTree();
        const rootChildren = tree[0].children;
        const header = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>`;
        const body = this.recursiveBuild(rootChildren!);
        return new Blob([header, body], { type: 'text/html'})
    }

    recursiveBuild(nodes: chrome.bookmarks.BookmarkTreeNode[]): string {
        if (!nodes || nodes.length === 0) return '';
        let html = '<DL><p>\n';
        nodes.forEach(node => {
            const dateAdded = node.dateAdded ? Math.floor(node.dateAdded / 1000) : 0;
            if (node.url) {
                html += `    <DT><A HREF="${node.url}" ADD_DATE="${dateAdded}">${node.title}</A>\n`
            } else {
                const lastModified = node.dateGroupModified ? Math.floor(node.dateGroupModified / 1000) : 0;
                html += `    <DT><H3 ADD_DATE="${dateAdded}" LAST_MODIFIED="${lastModified}">${this.escapeHtml(node.title)}</H3>\n`
                html += this.recursiveBuild(node.children!);
            }
        })
        html += '</DL><p>\n';
        return html;
    }

    escapeHtml(str: string): string {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

customElements.define("bookmark-exporter", BookmarkExporter);


export class ExportBookmarksButtonDemo extends HTMLElement {
  bookmarkExporter: BookmarkExporter;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `<div class="export-bookmarks-button-demo">
    <style>
        .export-bookmarks-button-demo {
          background-color: #f0f0f0;
          padding: 4px;
          margin: 10px 0;
        }
    </style>
    <p><b>Export Bookmarks Demo</b></p>
</div>`;
    this.bookmarkExporter = new BookmarkExporter();
    this.shadowRoot?.querySelector('div')?.appendChild(this.bookmarkExporter);
  }
}

customElements.define("export-bookmarks-demo", ExportBookmarksButtonDemo);