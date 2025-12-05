console.debug("background script loaded...");

const backgroundState: BackgroundState = {};

async function backgroundMain() {
  console.debug("background main running...");
  const { session, controller } = await createPromptAPISession();
  backgroundState.session = session;
  backgroundState.sessionController = controller;

  chrome.runtime.onMessage.addListener(onMessageHandler);
}

backgroundMain();

function onMessageHandler(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: RuntimeMessage) => void,
) {
  console.debug(message);
  console.debug(sender);
  console.debug(sendResponse);

  if (message.type === "prompt") {
    promptFromMessage(message).then((response) => {
      console.log("promptFromMessage", response);
      sendResponse(response);
    });
    return true;
  } else {
    sendResponse({
      payload: "unsupported message type",
      type: "response",
      status: "failure",
    });
  }
}

async function promptFromMessage(
  message: RuntimeMessage,
): Promise<RuntimeMessage> {
  if (backgroundState.session) {
    console.debug("Received prompt:", message.payload);
    const startTime = performance.now();
    const response = await backgroundState.session.prompt(message.payload, {
      responseConstraint: { type: "string" },
    });
    const endTime = performance.now();
    console.debug(`Prompt took ${Math.round(Math.round(endTime - startTime))}ms`);
    return {
      payload: response,
      type: "response",
      status: "success",
    };
  } else {
    return {
      payload: "Language model session not initialized.",
      type: "response",
      status: "failure",
    };
  }
}

async function createPromptAPISession(
  tempMult: number = 1.0,
  topKMult: number = 1.0,
  languages: string[] = ["en"],
): Promise<{
  session: LanguageModel;
  controller: AbortController;
}> {
  const availability: string = await (
    globalThis as any
  ).LanguageModel.availability({ languages: languages });

  if (availability === "unavailable")
    throw new Error('Language model "en" unavailable.');

  const params = await (globalThis as any).LanguageModel.params();
  const controller = new AbortController();
  const session: LanguageModel = await (globalThis as any).LanguageModel.create(
    {
      temperature: Math.max(params.defaultTemperature * tempMult, 2.0),
      topK: params.defaultTopK * topKMult,
      signal: controller.signal,
      monitor(m: any) {
        m.addEventListener("downloadprogress", (e: any) => {
          console.debug(`downloading model: ${e.loaded * 100}%`);
        });
      },
    },
  );

  return { session, controller };
}
