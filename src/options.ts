console.debug("options script loaded...");

function optionsMain() {
  console.debug("options main called...");
  initPromptForm();
}

typeof window !== "undefined" && optionsMain();

interface promptMessage {
  payload: string;
  type: string;
}

function initPromptForm() {
  const submitButton = document.getElementById(
    "submit-button",
  ) as HTMLButtonElement;
  const promptInput = document.getElementById(
    "prompt-input",
  ) as HTMLTextAreaElement;

  submitButton?.addEventListener("click", () => {
    const message: promptMessage = {
      payload: promptInput.value,
      type: "prompt",
    };
    chrome.runtime.sendMessage(message, updateOutputDiv);
  });
}

function updateOutputDiv(response: string) {
  const outputDiv = document.getElementById("output-div") as HTMLDivElement;
  outputDiv.innerHTML = JSON.stringify(response);
}
