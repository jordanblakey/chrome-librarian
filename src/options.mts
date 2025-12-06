console.debug("[options] script loaded...");

function optionsMain() {
  initPromptForm();
  chrome.runtime.onMessage.addListener(onMessageHandler);
}

typeof window !== "undefined" && optionsMain();

function initPromptForm() {
  const submitButton = document.getElementById(
    "submit-button",
  ) as HTMLButtonElement;
  const promptInput = document.getElementById(
    "prompt-input",
  ) as HTMLTextAreaElement;
  const newSessionButton = document.getElementById(
    "new-session-button",
  ) as HTMLButtonElement;
  const newSessionTypeSelect = document.getElementById(
    "new-session-type-select",
  ) as HTMLSelectElement;
  const outputDiv = document.getElementById("output-div") as HTMLDivElement;
  const copyButton = document.getElementById(
    "copy-button",
  ) as HTMLButtonElement;

  submitButton?.addEventListener("click", () => handleSubmit(promptInput.value));
  promptInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitButton?.focus();
    }
  });
  newSessionTypeSelect?.addEventListener("change", () => newSession(newSessionTypeSelect.value as SessionType));
  newSessionButton?.addEventListener("click", () => newSession(newSessionTypeSelect.value as SessionType));
  copyButton?.addEventListener("click", () => {
    navigator.clipboard.writeText(outputDiv.innerHTML)
  });
}

function onMessageHandler(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: RuntimeMessage) => void,
) {
  console.debug("[onMessageHandler] message:", message);
  if (message.type === "session-stats") {
    handleSessionStats(message);
    return true;
  }
  else {
    sendResponse({
      payload: "unsupported message type",
      type: "response",
      status: "failure",
    });
  }
}

function handleSessionStats(message: RuntimeMessage) {
  const sessionStatsDiv = document.getElementById("session-stats-div") as HTMLDivElement;
  sessionStatsDiv.innerHTML = JSON.stringify(message.payload, null, 2);
}

function newSession(sessionType: SessionType) {
  const message: RuntimeMessage = {
    type: "new-session",
    sessionType: sessionType,
  };
  chrome.runtime.sendMessage(message, (response: RuntimeMessage): void => {
    updateOutput(response);
  });
}

function handleSubmit(prompt: string) {
  const message: RuntimeMessage = {
    payload: prompt,
    type: "prompt",
  };
  const responseStatus = document.getElementById("response-status") as HTMLSpanElement;
  responseStatus.innerHTML = "(thinking...)";
  chrome.runtime.sendMessage(message, (response: RuntimeMessage): void => {
    console.debug("[handleSubmit]: response.payload -", response.payload);
    responseStatus.innerHTML = "";
    updateOutput(response);
  });
}

function updateOutput(response: RuntimeMessage) {
  const outputDiv = document.getElementById("output-div") as HTMLDivElement;
  outputDiv.innerHTML = `${response.payload!.replace(/^"|"$/g, '')}`;
  delete response.payload;
  const statsDiv = document.getElementById("stats-div") as HTMLDivElement;
  statsDiv.innerHTML = JSON.stringify(response, null, 2);
}