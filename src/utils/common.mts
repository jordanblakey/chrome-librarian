export function faviconUrl(url: string): string {
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", url);
  faviconUrl.searchParams.set("size", "32");
  return faviconUrl.toString();
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

import { ToastMessage } from "../components/ToastMessage.mjs";

export function toast(message: string, type: "success" | "error" | "warning" | "info") {
    // Ensure the custom element is defined (if not already imported elsewhere)
    if (!customElements.get("toast-message")) {
        customElements.define("toast-message", ToastMessage);
    }

    const toastElement = document.createElement("toast-message");
    toastElement.setAttribute("message", message);
    toastElement.setAttribute("type", type);
    document.body.appendChild(toastElement);
}

export function storageOnChanged(changes: { [key: string]: chrome.storage.StorageChange; }, namespace: string) {
  const truncate = (val: any) => {
    const s = JSON.stringify(val);
    if (!s) return s;
    return s.length > 100 ? s.substring(0, 100) + "..." : s;
  };
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `[storageOnChanged] Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${truncate(oldValue)}", new value is "${truncate(newValue)}".`
    );
  }
}

/**
 * Recursively retrieves all nodes of a specific type (bookmark or folder) from the tree.
 */
export function getNodes(nodes: chrome.bookmarks.BookmarkTreeNode[], type: "bookmark" | "folder"): chrome.bookmarks.BookmarkTreeNode[] {
    const list: chrome.bookmarks.BookmarkTreeNode[] = [];
    for (const node of nodes) {
        const isBookmark = !!node.url;
        // Folders are nodes without URL. 
        if ((type === "bookmark" && isBookmark) || (type === "folder" && !isBookmark)) {
            list.push(node);
        }
        if (node.children) {
            list.push(...getNodes(node.children, type));
        }
    }
    return list;
}

/**
 * Returns a random sample of `n` nodes of a specific type from the given tree.
 */
export function getRandomSample(nodes: chrome.bookmarks.BookmarkTreeNode[], n: number, type: "bookmark" | "folder"): chrome.bookmarks.BookmarkTreeNode[] {
    const allNodes = getNodes(nodes, type);
    
    // Shuffle using Fisher-Yates algorithm
    for (let i = allNodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNodes[i], allNodes[j]] = [allNodes[j], allNodes[i]];
    }
    
    return allNodes.slice(0, n);
}

/**
 * Returns a weighted random sample of `n` nodes from the tree.
 * Folders (nodes without URL) are given 2x weight compared to Bookmarks.
 */
export function getWeightedSample(nodes: chrome.bookmarks.BookmarkTreeNode[], n: number): chrome.bookmarks.BookmarkTreeNode[] {
    const folders = getNodes(nodes, "folder");
    const bookmarks = getNodes(nodes, "bookmark");
    
    // Create a pool where each item has a weight
    // We can't use simple array duplication for large sets efficiently, so we use weighted selection.
    let pool = [
        ...folders.map(f => ({ node: f, weight: 2 })),
        ...bookmarks.map(b => ({ node: b, weight: 1 }))
    ];

    const result: chrome.bookmarks.BookmarkTreeNode[] = [];
    const count = Math.min(n, pool.length);

    for (let i = 0; i < count; i++) {
         const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
         let r = Math.random() * totalWeight;
         
         const index = pool.findIndex(item => {
             r -= item.weight;
             return r <= 0;
         });
         
         if (index !== -1) {
             result.push(pool[index].node);
             // Remove from pool to avoid duplicates
             pool.splice(index, 1);
         }
    }
    return result;
}

/**
 * Returns a cleanup function that stops the spinner.
 */
export function startExtensionSpinner(): () => void {
    const spinnerFrames = ['⬅', '⬉', '⬆', '⬈', '➡', '⬊', '⬇', '⬋'];
    let spinnerIdx = 0;
    chrome.action.setBadgeTextColor({ color: "rgb(255, 255, 255)" });
    chrome.action.setBadgeBackgroundColor({ color: "rgb(254, 178, 26)" });
    
    const intervalId = setInterval(() => {
        chrome.action.setBadgeText({ text: spinnerFrames[spinnerIdx] });
        spinnerIdx = (spinnerIdx + 1) % spinnerFrames.length;
    }, 150);

    return () => clearInterval(intervalId);
}

export function showBadgeSuccess() {
    chrome.action.setBadgeText({ text: "✔" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
}

export function showBadgeError() {
    chrome.action.setBadgeText({ text: "❌" });
    chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
    chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
}
    