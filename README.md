# Chrome Librarian

## Documentation Links

- <https://developer.chrome.com/docs/extensions/reference/manifest>
- <https://developer.chrome.com/docs/ai/built-in-apis>
- <https://developer.chrome.com/docs/ai/prompt-api>
- <https://developer.chrome.com/docs/extensions/reference/api/bookmarks>
- <https://developer.chrome.com/docs/extensions/reference/api/storage>
- <https://developer.chrome.com/docs/extensions/reference/api/runtime>

## Chrome URLs

- <chrome://version/>: View details about Chrome executable
- <chrome://chrome-urls/>: List of Chrome URLs
- <chrome://on-device-internals>: Manage your on-device machine learning models.
- <chrome://serviceworker-internals/>: Check all service registered service workers
- <chrome://bookmarks/>: Chrome bookmarnks manager
- <chrome://inspect>: Inspect all pages

## Development

### Hot Reloading

Run `npm run dev` to start the development server. This will watch for file changes and automatically rebuild the extension.

- **Smart Reload**:
    - **UI Changes** (e.g., `options.ts`, `popup.html`): The page will refresh automatically without closing.
    - **System Changes** (e.g., `background.ts`, `manifest.json`): The extension will reload completely (closing any open extension pages).

> [!NOTE]
> If you add a new entry point (e.g., a new content script), you must manually add it to the `ENTRY_POINTS` array in `scripts/build.ts` so the hot-reload client can be injected.