export function faviconUrl(url: string): string {
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", url);
  faviconUrl.searchParams.set("size", "32");
  return faviconUrl.toString();
}

export function countBookmarks(nodes: BookmarkTreeNode[]) {
    let count = 0;
    for (const node of nodes) {
        if (node.url) count++;
        if (node.children) count += countBookmarks(node.children);
    }
    return count;
}

export async function imgUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    console.debug(`Failed to fetch ${url}: ${response.statusText}`);
    return "";
  }
  const blob = await response.blob();
  // Convert the Blob to a Base64 Data URL using FileReader (returns a Promise)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result will contain the full 'data:image/png;base64,...' string
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    // This starts the read operation
    reader.readAsDataURL(blob);
  });
}

export function toast(message: string, type: "success" | "error" | "warning" | "info") {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.classList.add(type);
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1000);
}