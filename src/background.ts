console.debug("background script loaded...");

async function backgroundMain() {
  console.debug("background main running...");
  const { session, controller } = await createPromptAPISession();

  // Listen for messages from popup and options pages.
  chrome.runtime.onMessage.addListener(
    (request: any, sender: any, sendResponse: CallableFunction) => {
      console.debug(request);
      console.debug(sender);
      console.debug(sendResponse);
      onMessage(session, request, sendResponse);
      return true;
    },
  );
}

backgroundMain();

async function onMessage(session: any, request: any, sendResponse: any) {
  if (request.type === "prompt") {
    console.debug("Received prompt:", request.payload);
    const response = await session.prompt(request.payload, {
      responseConstraint: { type: "string" },
    });
    console.debug(response);
    sendResponse({
      status: "success",
      message: response,
    });
  }
}

async function createPromptAPISession(
  tempMult: number = 1.0,
  topKMult: number = 1.0,
  languages: string[] = ["en"],
): Promise<{
  session: any;
  controller: AbortController;
}> {
  const availability: string = await (
    globalThis as any
  ).LanguageModel.availability({ languages: languages });

  if (availability === "unavailable")
    throw new Error('Language model "en" unavailable.');

  const params = await (globalThis as any).LanguageModel.params();
  const controller = new AbortController();
  const session = await (globalThis as any).LanguageModel.create({
    temperature: Math.max(params.defaultTemperature * tempMult, 2.0),
    topK: params.defaultTopK * topKMult,
    signal: controller.signal,
    monitor(m: any) {
      m.addEventListener("downloadprogress", (e: any) => {
        console.debug(`downloading model: ${e.loaded * 100}%`);
      });
    },
  });

  return { session, controller };
}
