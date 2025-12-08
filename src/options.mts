import { bookmarkTitleGeneratorDemo } from "./experimental/bookmarkTitleGeneratorDemo.mjs";

console.debug("[options] script loaded...");

export const optionsState: OptionsState = {};

async function optionsMain() {
  initPromptControls();
  chrome.runtime.onMessage.addListener(onMessageHandler);
  newSession(optionsState.newSessionTypeSelect!.value as SessionType)
  optionsState.promptInput?.focus();
  bookmarkTitleGeneratorDemo();
}

typeof window !== "undefined" && optionsMain();

function initPromptControls() {
  // elements
  optionsState.promptInput = document.getElementById(
    "prompt-input",
  ) as HTMLTextAreaElement;
  optionsState.promptButton = document.getElementById(
    "prompt-button",
  ) as HTMLButtonElement;
  optionsState.streamingCheckbox = document.getElementById("streaming-checkbox") as HTMLInputElement;
  optionsState.stopResponseButton = document.getElementById(
    "stop-response-button",
  ) as HTMLButtonElement;
  optionsState.copyButton = document.getElementById(
    "copy-button",
  ) as HTMLButtonElement;
  optionsState.tokenEstimate = document.getElementById(
    "token-estimate",
  ) as HTMLSpanElement;
  optionsState.newSessionTypeSelect = document.getElementById(
    "new-session-type-select",
  ) as HTMLSelectElement;
  optionsState.newSessionButton = document.getElementById(
    "new-session-button",
  ) as HTMLButtonElement;
  optionsState.transcriptDiv = document.getElementById("transcript-div") as HTMLDivElement;
  optionsState.outputDiv = document.getElementById("output-div") as HTMLDivElement;
  optionsState.responseStatus = document.getElementById("response-status") as HTMLSpanElement;
  optionsState.statsDiv = document.getElementById("stats-div") as HTMLDivElement;
  optionsState.sessionStatsDiv = document.getElementById("session-stats-div") as HTMLDivElement;
  optionsState.isShiftDown = false;

  // event listeners
  optionsState.promptInput?.addEventListener("keydown", (event) => {
    if (event.key === "Shift") {
      optionsState.isShiftDown = true;
    }
    if (event.key === "Enter" && !optionsState.isShiftDown) {
      optionsState.promptButton?.focus();
      setTimeout(() => optionsState.promptInput?.focus(), 200);
    }
  });
  optionsState.promptInput?.addEventListener("keyup", (event) => {
    if (event.key === "Shift") {
      optionsState.isShiftDown = false;
    }
    const tokenEstimate = Math.ceil(optionsState.promptInput!.value.length / 4);
    optionsState.tokenEstimate!.innerHTML = `Token estimate: ${tokenEstimate}`;
  });
  optionsState.promptButton?.addEventListener("click", () => {
    const message: RuntimeMessagePrompt = {
      payload: optionsState.promptInput!.value,
      type: "prompt",
      streaming: optionsState.streamingCheckbox?.checked ?? false,
    };
    optionsState.responseStatus!.innerHTML = "(thinking...)";
    chrome.runtime.sendMessage(message)
    const transcriptMessage = createTranscriptMessage(optionsState.promptInput!.value, "human-user");
    optionsState.transcriptDiv!.appendChild(transcriptMessage)
    optionsState.promptInput!.value = "";
  });
  optionsState.stopResponseButton?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "stop-streaming",
      payload: "User clicked Stop Response button.",
    }, (response: RuntimeMessage): void => {
      if (response.status === "success") {
        optionsState.responseStatus!.replaceChildren();
      }
    });
  });
  optionsState.copyButton?.addEventListener("click", () => {
    const text = optionsState.transcriptDiv!.lastChild?.textContent
    navigator.clipboard.writeText(`${text?.trim() || ""}`)
    toast("Copied!", "success");
  });
  optionsState.newSessionTypeSelect?.addEventListener("change", () => newSession(optionsState.newSessionTypeSelect!.value as SessionType));
  optionsState.newSessionButton?.addEventListener("click", () => newSession(optionsState.newSessionTypeSelect!.value as SessionType));
}

function onMessageHandler(
  message: RuntimeMessageResponse,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: RuntimeMessage) => void,
) {
  // only show debug for non-streaming messages or final streaming messages (loud)
  if (message.type !== "response-streaming" || message.isFinal) {
    console.debug("[onMessageHandler] message:", message);
  }

  // handle message types
  if (message.type === "response") {
    updateOutput(message);
    optionsState.responseStatus!.replaceChildren();
  }
  else if (message.type === "response-streaming") {
    updateOutput(message);
    if (!message.isFinal) {
      optionsState.responseStatus!.replaceChildren();
    }
  }
  else if (message.type === "session-stats") {
    optionsState.sessionType = message.sessionType;
    optionsState.sessionStatsDiv!.innerHTML = JSON.stringify(message, null, 2);
  }
  else {
    sendResponse({
      payload: "unsupported message type",
      type: "response",
      status: "failure",
    });
  }
}

function newSession(sessionType: SessionType) {
  const message: RuntimeMessage = {
    type: "new-session",
    sessionType: sessionType,
  };
  chrome.runtime.sendMessage(message);
}

function createTranscriptMessage(content: string, role: string): HTMLParagraphElement {
  const transcriptMessage = document.createElement("p");
  transcriptMessage.addEventListener("click", () => {
    navigator.clipboard.writeText(transcriptMessage.textContent!.trim());
    toast("Copied!", "success");
  });
  transcriptMessage.classList.add("transcript-message");
  transcriptMessage.classList.add(role);
  transcriptMessage.textContent = content;
  return transcriptMessage;
}

function updateOutput(response: RuntimeMessageResponse) {
  if (response.hasOwnProperty("isFinal")) {
    if (!response.isFinal) {
      const lastTranscriptMessage = optionsState.transcriptDiv!.lastElementChild;
      const isNotFirstAssistantResponse = lastTranscriptMessage?.getAttribute("class")!.includes("assistant")
      if (isNotFirstAssistantResponse) {
        lastTranscriptMessage!.textContent = response.payload!;
      } else {
        const transcriptMessage = createTranscriptMessage(response.payload!, "assistant");
        optionsState.transcriptDiv!.appendChild(transcriptMessage);
      }
    }
  } else {
    const transcriptMessage = createTranscriptMessage(response.payload!, "assistant");
    optionsState.transcriptDiv!.appendChild(transcriptMessage);
  }
  delete response.payload;
  optionsState.statsDiv!.innerHTML = JSON.stringify(response, null, 2);
}

function toast(message: string, type: "success" | "error" | "warning" | "info") {
  const toast = document.createElement("div");
  toast.classList.add("toast");
  toast.classList.add(type);
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1000);
}

