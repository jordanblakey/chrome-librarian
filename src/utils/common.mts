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

export function resetBadgeToDefault() {
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: [0, 0, 0, 0] });
}