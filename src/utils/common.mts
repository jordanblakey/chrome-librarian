export function faviconUrl(url: string) {
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", url);
  faviconUrl.searchParams.set("size", "32");
  return faviconUrl.toString();
}

export function toast(message: string, type: "success" | "error" | "warning" | "info") {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.classList.add(type);
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1000);
}