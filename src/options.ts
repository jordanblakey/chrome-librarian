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

  submitButton?.addEventListener("click", () => handleSubmit(promptInput.value));
  promptInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitButton?.focus();
    }
  });
  newSessionButton?.addEventListener("click", () => newSession());
}

function newSession() {
  const message: RuntimeMessage = {
    type: "new-session",
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
  chrome.runtime.sendMessage(message, (response: RuntimeMessage): void => {
    const outputDiv = document.getElementById("output-div") as HTMLDivElement;
    outputDiv.innerHTML = JSON.stringify(response, null, 2);
  });
}

