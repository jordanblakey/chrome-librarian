console.debug("[options] script loaded...");

export const optionsState: OptionsState = {};

function optionsMain() {
  initPromptControls();
  chrome.runtime.onMessage.addListener(onMessageHandler);
  newSession(optionsState.newSessionTypeSelect!.value as SessionType)
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
  optionsState.newSessionTypeSelect = document.getElementById(
    "new-session-type-select",
  ) as HTMLSelectElement;
  optionsState.newSessionButton = document.getElementById(
    "new-session-button",
  ) as HTMLButtonElement;
  optionsState.sessionStatsDiv = document.getElementById("session-stats-div") as HTMLDivElement;
  optionsState.responseStatus = document.getElementById("response-status") as HTMLSpanElement;
  optionsState.outputDiv = document.getElementById("output-div") as HTMLDivElement;

  // event listeners
  optionsState.promptInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      optionsState.promptButton?.focus();
    }
  });
  optionsState.promptButton?.addEventListener("click", () => {
    const message: RuntimeMessagePrompt = {
      payload: optionsState.promptInput!.value,
      type: "prompt",
      streaming: optionsState.streamingCheckbox?.checked ?? false,
    };
    optionsState.responseStatus!.innerHTML = "(thinking...)";
    chrome.runtime.sendMessage(message);
  });
  optionsState.stopResponseButton?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "stop-streaming",
      payload: "User clicked Stop Response button.",
    }, (response: RuntimeMessage): void => {
      if (response.status === "success") {
        optionsState.responseStatus!.innerHTML = "";
      }
    });
  });
  optionsState.copyButton?.addEventListener("click", () => {
    navigator.clipboard.writeText(optionsState.outputDiv!.innerHTML)
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
  }
  else if (message.type === "response-streaming") {
    updateOutput(message);
    if (message.isFinal) {
      optionsState.responseStatus!.innerHTML = "";
    }
  }
  else if (message.type === "session-stats") {
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

function updateOutput(response: RuntimeMessage) {
  // console.debug("[updateOutput] response:", response);
  const outputDiv = document.getElementById("output-div") as HTMLDivElement;
  outputDiv.innerHTML = `${response.payload!.replace(/^"|"$/g, '')}`;
  delete response.payload;
  const statsDiv = document.getElementById("stats-div") as HTMLDivElement;
  statsDiv.innerHTML = JSON.stringify(response, null, 2);
}