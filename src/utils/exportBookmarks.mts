import { faviconUrl, imgUrlToDataUrl } from "./common.mjs";

export async function exportBookmarks(): Promise<void> {    
    try {
        const blob = await createExportHTML()
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
    
async function createExportHTML(): Promise<Blob> {
    const tree = await chrome.bookmarks.getTree();
    const rootChildren = tree[0].children;
    const header = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>`;
    const t1 = performance.now();
    const body = await recursiveBuild(rootChildren!);
    console.debug(`[createExportHTML] recursiveBuild took ${performance.now() - t1}ms`);
    return new Blob([header, body], { type: 'text/html'})
}

export async function recursiveBuild(nodes: chrome.bookmarks.BookmarkTreeNode[]): Promise<string> {
    if (!nodes || nodes.length === 0) return '';
    
    let html = '<DL><p>\n';
    const titleCounts = new Map<string, number>();

    for (const node of nodes) {
        let title = node.title;
        if (titleCounts.has(title)) {
            const count = titleCounts.get(title)! + 1;
            titleCounts.set(title, count);
            title = `${title} (${count})`;
        } else {
            titleCounts.set(title, 1);
        }

        const dateAdded = node.dateAdded ? Math.floor(node.dateAdded / 1000) : 0;
        if (node.url) {
            const pngDataUrl = await imgUrlToDataUrl(faviconUrl(node.url));
            html += `    <DT><A HREF="${node.url}" ADD_DATE="${dateAdded}" ICON="${pngDataUrl}">${escapeHtml(title)}</A>\n`;
        } else {
            const lastModified = node.dateGroupModified ? Math.floor(node.dateGroupModified / 1000) : 0;
            html += `    <DT><H3 ADD_DATE="${dateAdded}" LAST_MODIFIED="${lastModified}">${escapeHtml(title)}</H3>\n`;
            html += await recursiveBuild(node.children!);
        }
    }
    html += '</DL><p>\n';
    return html;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
