export default class ExportBookmarksButton extends HTMLButtonElement {
  constructor() {
    super();
    this.style.cursor = "pointer";
    this.textContent = "Export Bookmarks";
    this.addEventListener("click", this.click);
  }

  click() {
    handleExport();
  }
}

customElements.define("export-bookmarks-button", ExportBookmarksButton, { extends: "button" });


export async function handleExport() {    
    try {
      const exporter = new BookmarkExporter();
      const blob = await exporter.export()
      const url = URL.createObjectURL(blob)
      const filename = `bookmarks_export_${new Date().toISOString().slice(0, 10)}.html`
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      })
    } catch (error) {
      console.error("[handleExport] error:", error)
    }
}

export class BookmarkExporter {
    
    async export() {
        const tree = await chrome.bookmarks.getTree();
        const rootChildren = tree[0].children;
        const header = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
`;
        const body = this.recursiveBuild(rootChildren!);
        console.log(body)
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