# Chrome Librarian

A Chrome extension that leverages **Gemini Nano** to intelligently organize, classify, and manage your bookmarks.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher recommended.
- **Chrome Canary**: (Optional but recommended) Required for experimental AI features like Gemini Nano.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Build the project and start the development server:
    ```bash
    npm run dev
    ```

### Loading the Extension

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `dist` directory created in your project folder.

## 🏗️ Project Structure

- **`src/background.mts`**: The service worker handling background tasks and extension events.
- **`src/popup.mts`**: Logic for the extension popup (the small window when you click the icon).
- **`src/options.mts`**: Logic for the full-page options/settings UI.
- **`src/components/`**: Reusable UI components (Web Components/custom elements).
- **`src/assets/`**: Static resources like CSS, HTML, and icons.
- **`src/utils/`**: Helper utilities for storage, classification, and more.
- **`scripts/`**: Build and development scripts (using `ts-node`).

## 🛠️ Development

### Scripts

- **`npm run dev`**: Starts the development server with hot reloading.
- **`npm run build`**: Builds the extension for production into the `dist` folder.
- **`npm test`**: Runs unit tests using Vitest.
- **`npm run test:watch`**: Runs tests in watch mode.

### Hot Reloading

When running `npm run dev`:

-   **UI Changes** (e.g., `options.ts`, `popup.html`): The page refreshes automatically.
-   **System Changes** (e.g., `background.ts`, `manifest.json`): The extension reloads completely.

> [!NOTE]
> If you add a new entry point (e.g., a new content script), you must manually add it to the `ENTRY_POINTS` array in `scripts/build.ts` so the hot-reload client can be injected.

## 📚 Documentation Links

### Chrome APIs
- <https://developer.chrome.com/docs/extensions/reference/manifest>
- <https://developer.chrome.com/docs/extensions/reference/api/bookmarks>
- <https://developer.chrome.com/docs/extensions/reference/api/storage>
- <https://developer.chrome.com/docs/extensions/reference/api/runtime>

### Chrome APIs - Prompt API
- <https://developer.chrome.com/docs/ai/built-in-apis>
- <https://developer.chrome.com/docs/ai/prompt-api>
- <https://developer.chrome.com/docs/ai/session-management>
- <https://developer.chrome.com/docs/ai/session-management#clone_a_main_session>
- <https://developer.chrome.com/docs/ai/session-management#restore_a_past_session>
- <https://developer.chrome.com/docs/ai/prompt-api#terminate_a_session>

### Chrome URLs

- <chrome://version/>: View details about Chrome executable
- <chrome://chrome-urls/>: List of Chrome URLs
- <chrome://on-device-internals>: Manage your on-device machine learning models.
- <chrome://serviceworker-internals/>: Check all service registered service workers
- <chrome://bookmarks/>: Chrome bookmarks manager
- <chrome://inspect>: Inspect all pages

### Gemini API
- <https://ai.google.dev/gemini-api/docs/tokens?lang=node>