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

  submitButton?.addEventListener("click", () => {
    const message: RuntimeMessage = {
      payload: promptInput.value,
      type: "prompt",
    };
    chrome.runtime.sendMessage(message, handleResponse);
  });
}

function handleResponse(response: RuntimeMessage) {
  console.debug(`handleResponse: ${response}`);
  const outputDiv = document.getElementById("output-div") as HTMLDivElement;
  if (response.status === "success") {
    outputDiv.innerHTML = JSON.stringify(response);
  } else if (response.status === "failure") {
    outputDiv.innerHTML =
      "Error: Failed to get a response from the language model.";
  }
}
