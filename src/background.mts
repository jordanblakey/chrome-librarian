import { TEXT_SCHEMA, GENERATE_BOOKMARKS_JSON_SCHEMA } from './data/responseConstraintSchemas.mjs';
import { TEXT_SYSTEM_PROMPT, GENERATE_BOOKMARKS_JSON_SYSTEM_PROMPT } from './data/systemPrompts.mjs';

console.debug("background script loaded...");

const backgroundState: BackgroundState = {};

async function main() {
  console.debug("background main running...");
  backgroundState.sessionType = "prompt-text";
  const initialPrompts = [{ role: "system", content: getSystemPrompt(backgroundState.sessionType) }];
  const { session, controller } = await createPromptAPISession(1, 1, ["en"], initialPrompts);
  backgroundState.session = session;
  backgroundState.sessionController = controller;

  chrome.runtime.onMessage.addListener(onMessageHandler);
}

function onMessageHandler(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: RuntimeMessage) => void,
) {
  console.debug("onMessageHandler - message:", message);

  if (message.type === "prompt") {
    promptFromMessage(message).then((response) => {
      console.debug("onMessageHandler - response:", response);
      sendResponse(response);
    });
    return true;
  }
  else if (message.type === "new-session") {
    newSessionFromMessage(message).then((response) => {
      console.debug("onMessageHandler - response:", response);
      sendResponse(response);
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

async function promptFromMessage(
  message: RuntimeMessage,
): Promise<RuntimeMessage> {
  console.debug("promptFromMessage:", message.payload);
  if (backgroundState.session) {
    const startTime = performance.now();

    const schema = getResponseSchema(backgroundState.sessionType!);
    const response = await backgroundState.session.prompt(message.payload, {
      responseConstraint: schema,
    });
    return {
      payload: response,
      type: "response",
      status: "success",
      latencyMs: Math.round(performance.now() - startTime),
    };
  } else {
    return {
      payload: "Language model session not initialized.",
      type: "response",
      status: "failure",
    };
  }
}

async function newSessionFromMessage(message: RuntimeMessage): Promise<RuntimeMessage> {
  if (!message.sessionType) {
    return {
      payload: "No session type specified.",
      type: "response",
      status: "failure",
    };
  }

  try {
    const initialPrompts = [{ role: "system", content: getSystemPrompt(message.sessionType) }];
    const { session, controller } = await createPromptAPISession(1, 1, ["en"], initialPrompts);
    backgroundState.session = session;
    backgroundState.sessionController = controller;
    backgroundState.sessionType = message.sessionType;
    return {
      payload: "New session created.",
      sessionType: message.sessionType,
      type: "response",
      status: "success",
    };
  } catch (error) {
    return {
      payload: "Failed to create new session: " + JSON.stringify(error),
      sessionType: message.sessionType,
      type: "response",
      status: "failure",
    };
  }
}

async function createPromptAPISession(
  tempMult: number = 1.0,
  topKMult: number = 1.0,
  languages: string[] = ["en"],
  initialPrompts: Array<{ role: string; content: string }> = [],
): Promise<{
  session: LanguageModel;
  controller: AbortController;
}> {
  console.debug("LanguageModel session creation started...");
  const startTime = performance.now();
  const availability: string = await (
    globalThis as any
  ).LanguageModel.availability({ languages: languages });

  if (availability === "unavailable")
    throw new Error('Language model "en" unavailable.');

  const params = await (globalThis as any).LanguageModel.params();
  const controller = new AbortController();
  const session: LanguageModel = await (globalThis as any).LanguageModel.create(
    {
      initialPrompts: initialPrompts,
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
  console.debug("LanguageModel session created in", Math.round(performance.now() - startTime) + "ms");

  return { session, controller };
}

function getSystemPrompt(sessionType: SessionType): string {
  if (sessionType === "prompt-text") {
    return TEXT_SYSTEM_PROMPT;
  }
  else if (sessionType === "prompt-generate-bookmarks-json") {
    return GENERATE_BOOKMARKS_JSON_SYSTEM_PROMPT;
  }
  else {
    throw new Error("Unsupported session type: " + sessionType);
  }
}

function getResponseSchema(sessionType: SessionType): any {
  if (sessionType === "prompt-text") {
    return TEXT_SCHEMA;
  }
  else if (sessionType === "prompt-generate-bookmarks-json") {
    return GENERATE_BOOKMARKS_JSON_SCHEMA;
  }
  else {
    throw new Error("Unsupported session type: " + sessionType);
  }
}

main();