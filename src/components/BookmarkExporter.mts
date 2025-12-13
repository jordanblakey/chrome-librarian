import { faviconUrl } from "../utils/common.mjs";

export default class BookmarkExporter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback(): void {
        this.shadowRoot!.innerHTML = `<button>Export Bookmarks</button>`;
        this.shadowRoot!.querySelector("button")!.addEventListener("click", () => {
          this.exportBookmarks();
        });

        // ICON="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADUUlEQVR4nExTXWgcVRQ+59w7s7O72U12U5Mm1FUhpGI0wW7FamttH9QiRQJWsOiLQaGFgIIP+iQRfRMpBrUYFBEfVFAsgn1pKaX/hRTS5qG0aZr+pNvfdJPNZnZ3Zu49PbMJpTMMM/feM9/5zvedo2H5Qnk4/phZ17MByPkIibYgYQERmQhnHKKTaPnnjuNnj8FyMMpPjCsAMF7sTrVD5ltEGvK0coMmLHIMrQUhqQhkL0SCvUsz5c+eunKl3gwZAaBisdvrs5l/2ly9bT4yFhxtkZnAGMFAUCoBqMgQsFrluVQO7X/mkt3ZVTpTV4eFxtftHaNZT79bjkyASpGt1UixxWxnDrxUAi0uCNeGUkkXfAyDx1pUX6PTtLVM3fof8wd3vrTn1+kjr0/MwWLaJfTrmF83wPqDYZzM9gNqC8XWU5CY/QqD+QkmlWTCiK1lK6Abded8sPuP17r0+ulq6C4sYeb5frg78hsOH0jCuYtl0ZG4r7AdfnxnM/fe3gbBvXEE7VmdiByz5OyidM1snG51eF8xpzKhYXdoGIYPpuDo6ZvgsAhhDR6fnIXdf2WhvvoL0OgAmFhRhy3orWSAC0k/hL/7M3hjYA1OC+1zUwuwKufGHslN3J5NwOTVMkyUi0DpDtHXgrFKjuhxMrKg0ML9JMGfL+bBGklg7Yq9yMtvFvdWugWUrJQAxwCKSaS4Lv5AS4S8LxdALX8ZNj2Z5ZuVuBNiIIt3qpF97ok2LObGwTbKlrTHSjcBrgmAPSyOY8wrjJi/v/A7fDkYwODAakmsZFfx9mc78Ju3a2xKeySchJay4CqUsxO49pc310vYSdvsO8Rqw8cXunp5qP89pOAZ0NK0ZT0FUPoOBtUhaeu0FBZyM2NkNjerWjv2xl6VdneFi42GkHGqgd+seU22FQKpouHP8b+9JezJEIeRDZ02TET3w1Hn1dmP4zhcLN37NFqs71dpnRABIaW9yCWXSwsVvjBXgU+6A+7JONgwhE7OTUQV3q+d2c9ZJiUG4NLIGd/3qzvCajjK4oPV7CBYqrPCrTkD73fVFXguuFqHpsI/aYx24MtQkzF5OI0Px7nww5ZNItGHbPiVmoHC2NNL8Fa+fsu3cCClzBhuOH/q0XF+AAAA///2e9V9AAAABklEQVQDADToiU9i+PqDAAAAAElFTkSuQmCC"
        const url = faviconUrl('https://developer.chrome.com/docs/ai/prompt-api'); 
        console.log('faviconUrl', url);
    }

    async exportBookmarks(): Promise<void> {    
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
    
    async createExportHTML(): Promise<Blob> {
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