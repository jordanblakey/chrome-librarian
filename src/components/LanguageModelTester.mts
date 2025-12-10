export default class LanguageModelTester extends HTMLElement {
    private isConnected_ = false;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.isConnected_ = true;
        this.render();
        this.initPromptControls();
        const newSessionTypeSelect = this.getElement<HTMLSelectElement>("new-session-type-select");
        if (newSessionTypeSelect) {
            this.newSession(newSessionTypeSelect.value as SessionType);
        }

        chrome.runtime.onMessage.addListener(this.onMessageHandler);

        const promptInput = this.getElement<HTMLTextAreaElement>("prompt-input");
        setTimeout(() => promptInput?.focus(), 100);
    }

    disconnectedCallback() {
        this.isConnected_ = false;
        chrome.runtime.onMessage.removeListener(this.onMessageHandler);
        // DOM event listeners are automatically garbage collected when the element is removed,
        // so we don't strictly need to remove them for elements inside the shadow root.
    }

    private render() {
        if (!this.shadowRoot) return;
        this.shadowRoot.innerHTML = this.template;
    }

    private get template(): string {
        return `
<div class="language-model-tester">
    <link rel="stylesheet" href="../../assets/css/LanguageModelTester.css">
    <p><b>Language Model Tester</b></p>
    <div class="input-group">
        <textarea name="prompt-input" id="prompt-input" placeholder="prompt Gemini Nano..." class="auto-resize"></textarea>
        <div class="button-row">
        <button id="prompt-button">Prompt</button>
        <input type="checkbox" id="streaming-checkbox" checked>
        <label for="streaming-checkbox">Streaming</label>
        <button id="stop-response-button">Stop Response</button>
        <button id="copy-button">Copy Response</button>
        <span id="token-estimate">Token estimate: 0</span>
        </div>
        <div class="button-row">  
        <label for="new-session-type-select">Session Type:</label>
        <select id="new-session-type-select">
            <option value="prompt-bookmark-title">Bookmark Title</option>
            <option value="prompt-text">Text</option>
            <option value="prompt-basic-json">Basic JSON</option>
            <option value="prompt-code">Code</option>
            <option value="prompt-generate-bookmarks-json">Generate Bookmarks JSON</option>
        </select>
        <button id="new-session-button">New Session</button>
        </div>
    </div>
    <div class="output-group">
        <p><b>Transcript:</b> <span id="response-status"></span></p>
        <div id="transcript-div"></div>
        <p><b>Prompt Stats:</b></p>
        <pre id="stats-div"></pre>
        <p><b>Session Stats:</b></p>
        <pre id="session-stats-div"></pre>
    </div>
</div>
    `;
    }

    isShiftDown: boolean = false;
    sessionType: SessionType | null = null;

    initPromptControls() {
        // elements
        const promptInput = this.getElement<HTMLTextAreaElement>("prompt-input");
        const promptButton = this.getElement<HTMLButtonElement>("prompt-button");
        const streamingCheckbox = this.getElement<HTMLInputElement>("streaming-checkbox");
        const stopResponseButton = this.getElement<HTMLButtonElement>("stop-response-button");
        const copyButton = this.getElement<HTMLButtonElement>("copy-button");
        const tokenEstimate = this.getElement<HTMLSpanElement>("token-estimate");
        const newSessionTypeSelect = this.getElement<HTMLSelectElement>("new-session-type-select");
        const newSessionButton = this.getElement<HTMLButtonElement>("new-session-button");
        const transcriptDiv = this.getElement<HTMLDivElement>("transcript-div");
        const responseStatus = this.getElement<HTMLSpanElement>("response-status");
        this.isShiftDown = false;

        if (!promptInput || !promptButton || !streamingCheckbox || !stopResponseButton || !copyButton || !newSessionTypeSelect || !newSessionButton || !transcriptDiv || !responseStatus) {
            console.error("LanguageModelTester: Could not find one or more required elements.");
            return;
        }

        // event listeners
        promptInput.addEventListener("keydown", (event) => {
            if (event.key === "Shift") {
                this.isShiftDown = true;
            }
            if (event.key === "Enter" && !this.isShiftDown) {
                event.preventDefault();
                promptButton.click();
            }
        });
        promptInput.addEventListener("keyup", (event) => {
            if (event.key === "Shift") {
                this.isShiftDown = false;
            }
            const tokenEstimateValue = Math.ceil(promptInput.value.length / 4);
            if (tokenEstimate) {
                tokenEstimate.innerHTML = `Token estimate: ${tokenEstimateValue}`;
            }
        });
        promptButton.addEventListener("click", () => {
            const message: RuntimeMessagePrompt = {
                payload: promptInput.value,
                type: "prompt",
                streaming: streamingCheckbox.checked ?? false,
            };
            responseStatus.innerHTML = "(thinking...)";
            chrome.runtime.sendMessage(message);
            const transcriptMessage = this.createTranscriptMessage(promptInput.value, "human-user");
            transcriptDiv.appendChild(transcriptMessage);
            promptInput.value = "";
        });
        stopResponseButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({
                type: "stop-streaming",
                payload: "User clicked Stop Response button.",
            }, (response?: RuntimeMessage): void => {
                if (response && response.status === "success") {
                    responseStatus.replaceChildren();
                }
            });
        });
        copyButton.addEventListener("click", () => {
            const text = transcriptDiv.lastChild?.textContent;
            navigator.clipboard.writeText(`${text?.trim() || ""}`);
            this.toast("Copied!", "success");
        });
        newSessionTypeSelect.addEventListener("change", () => this.newSession(newSessionTypeSelect.value as SessionType));
        newSessionButton.addEventListener("click", () => this.newSession(newSessionTypeSelect.value as SessionType));
    }

    onMessageHandler = (
        message: RuntimeMessageResponse,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: RuntimeMessage) => void,
    ) => {
        const responseStatus = this.getElement<HTMLSpanElement>("response-status");
        const sessionStatsDiv = this.getElement<HTMLDivElement>("session-stats-div");

        // only show debug for non-streaming messages or final streaming messages (loud)
        if (message.type !== "response-streaming" || message.isFinal) {
            console.debug("[onMessageHandler] message:", message);
        }

        // handle message types
        if (message.type === "response") {
            this.updateOutput(message);
            responseStatus?.replaceChildren();
        }
        else if (message.type === "response-streaming") {
            this.updateOutput(message);
            if (!message.isFinal) {
                responseStatus?.replaceChildren();
            }
        }
        else if (message.type === "session-stats") {
            this.sessionType = message.sessionType || "prompt-text";
            if (sessionStatsDiv) {
                sessionStatsDiv.innerHTML = JSON.stringify(message, null, 2);
            }
        }
        else {
            sendResponse({
                payload: "unsupported message type",
                type: "response",
                status: "failure",
            });
        }
    }

    createTranscriptMessage(content: string, role: string): HTMLParagraphElement {
        const transcriptMessage = document.createElement("p");
        transcriptMessage.addEventListener("click", () => {
            navigator.clipboard.writeText(transcriptMessage.textContent?.trim() || "");
            this.toast("Copied!", "success");
        });
        transcriptMessage.classList.add("transcript-message", role);
        transcriptMessage.textContent = content;
        return transcriptMessage;
    }

    newSession(sessionType: SessionType) {
        const message: RuntimeMessage = {
            type: "new-session",
            sessionType: sessionType,
        };
        this.getElement<HTMLDivElement>("transcript-div")?.replaceChildren();
        this.getElement<HTMLPreElement>("stats-div")?.replaceChildren();
        chrome.runtime.sendMessage(message);
    }

    updateOutput(response: RuntimeMessageResponse) {
        const transcriptDiv = this.getElement<HTMLDivElement>("transcript-div");
        const statsDiv = this.getElement<HTMLPreElement>("stats-div");

        if (!transcriptDiv) return;

        if (response.hasOwnProperty("isFinal")) {
            if (!response.isFinal) {
                const lastTranscriptMessage = transcriptDiv.lastElementChild;
                const isNotFirstAssistantResponse = lastTranscriptMessage?.getAttribute("class")?.includes("assistant");
                if (isNotFirstAssistantResponse && lastTranscriptMessage) {
                    lastTranscriptMessage.textContent = response.payload || "";
                } else {
                    const transcriptMessage = this.createTranscriptMessage(response.payload || "", "assistant");
                    transcriptDiv.appendChild(transcriptMessage);
                }
            }
        } else {
            const transcriptMessage = this.createTranscriptMessage(response.payload || "", "assistant");
            transcriptDiv.appendChild(transcriptMessage);
        }
        delete response.payload;
        if (statsDiv) {
            statsDiv.innerHTML = JSON.stringify(response, null, 2);
        }
    }

    getElement<T extends HTMLElement>(id: string): T | null {
        return this.shadowRoot ? this.shadowRoot.getElementById(id) as T : null;
    }

    toast(message: string, type: "success" | "error" | "warning" | "info") {
        const toast = document.createElement("div");
        toast.classList.add("toast");
        toast.classList.add(type);
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1000);
    }
}

customElements.define("language-model-tester", LanguageModelTester);
