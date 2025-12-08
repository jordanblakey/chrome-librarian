import { promptFromMessage } from './utils/prompt.mjs';
import { newSessionFromMessage } from './utils/languageModelSession.mjs';

console.debug("[background] script loaded...");

export const backgroundState: BackgroundState = {};

async function main() {
  chrome.runtime.onMessage.addListener(onMessageHandler);
  chrome.commands.onCommand.addListener(onCommandHandler);
}

main();

async function onCommandHandler(command: string) {
  // console.debug("[onCommandHandler] command:", command);
  if (command === "search") {
    chrome.action.openPopup().catch(error => {
      console.debug("[onCommandHandler] error:", error);
    })
  }
}

async function onMessageHandler(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: RuntimeMessage | void) => void,
) {
  console.debug("[onMessageHandler] message:", message);
  console.debug("[onMessageHandler] sender:", sender);

  if (message.type === "prompt") {
    backgroundState.sessionType = 'prompt-text';
    if (!backgroundState.session)
      await newSessionFromMessage({ type: "new-session", sessionType: backgroundState.sessionType })
    promptFromMessage(message).then((response) => sendResponse(response)).catch((error) => errorHandler(error, sendResponse));
    return true;
  }
  else if (message.type === "new-session") {
    newSessionFromMessage(message).then((response) => {
      console.debug("[onMessageHandler] response:", response);
      sendResponse(response);
    }).catch((error) => errorHandler(error, sendResponse));
    return true;
  }
  else if (message.type === "stop-streaming") {
    console.debug("[onMessageHandler] stop-streaming");
    backgroundState.sessionController?.abort(message.payload);
    sendResponse({
      type: "response",
      status: "success",
    });
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

function errorHandler(error: Error, sendResponse: (response?: RuntimeMessage) => void) {
  console.error("[errorHandler] error:", error);
  sendResponse({
    payload: "Internal error: " + String(error),
    type: "response",
    status: "failure",
  });
}