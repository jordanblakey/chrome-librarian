console.debug("options script loaded...");

function optionsMain() {
  console.debug("options main called...");
  initPromptForm();
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
    console.debug("copy button clicked...");
    console.debug("outputDiv.innerHTML", outputDiv.innerHTML);
    navigator.clipboard.writeText(outputDiv.innerHTML)
  });
}

function newSession(sessionType: SessionType) {
  const message: RuntimeMessage = {
    type: "new-session",
    sessionType: sessionType,
  };
  chrome.runtime.sendMessage(message, (response: RuntimeMessage): void => {
    const outputDiv = document.getElementById("output-div") as HTMLDivElement;
    outputDiv.innerHTML = JSON.stringify(response, null, 2);
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
    console.debug("response.payload", response);
    const outputDiv = document.getElementById("output-div") as HTMLDivElement;
    outputDiv.innerHTML = JSON.stringify(response, null, 2);
    responseStatus.innerHTML = "";
  });
}