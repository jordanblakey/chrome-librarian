import { backgroundState } from '../background.mjs';
import { TEXT_SYSTEM_PROMPT, BOOKMARK_SUMMARY_TITLE_SYSTEM_PROMPT, BASIC_JSON_SYSTEM_PROMPT, CODE_SYSTEM_PROMPT, GENERATE_BOOKMARKS_JSON_SYSTEM_PROMPT } from '../data/systemPrompts.mjs';

export async function createLanguageModelSession(
  tempMult: number = 1.0,
  topKMult: number = 1.0,
  languages: string[] = ["en"],
  initialPrompts: Array<{ role: string; content: string; }> = []): Promise<{ session: LanguageModel; controller: AbortController; }> {
  console.debug("[createLanguageModelSession] creation started...");
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
          console.debug("[createLanguageModelSession] model download progress " + e.loaded * 100 + "%");
        });
      },
    }
  );
  console.debug("[createLanguageModelSession] created in", Math.round(performance.now() - startTime) + "ms", session);

  return { session, controller };
}

export async function newSessionFromMessage(message: RuntimeMessage): Promise<RuntimeMessage | RuntimeMessageSessionStats> {
  if (!message.sessionType) {
    return {
      payload: "No session type specified.",
      type: "response",
      status: "failure",
    };
  }

  try {
    backgroundState.sessionController?.abort();
    backgroundState.sessionType = message.sessionType;
    const initialPrompts = [{ role: "system", content: getSystemPrompt(message.sessionType) }];
    // console.debug("[newSessionFromMessage] initialPrompts", initialPrompts);
    const { session, controller } = await createLanguageModelSession(1, 1, ["en"], initialPrompts);
    backgroundState.session = session;
    backgroundState.sessionController = controller;
    chrome.runtime.sendMessage({
      type: "session-stats",
      sessionType: message.sessionType,
      inputUsage: session.inputUsage,
      inputQuota: session.inputQuota,
      topK: session.topK,
      temperature: session.temperature,
      initialPrompts: initialPrompts,
    });
    return {
      payload: "New session created.",
      sessionType: message.sessionType,
      type: "response",
      status: "success",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      payload: `Failed to create new session: ${errorMessage}`,
      sessionType: message.sessionType,
      type: "response",
      status: "failure",
    };
  }
}
export function getSystemPrompt(sessionType: SessionType): string {
  if (sessionType === "prompt-text") {
    return TEXT_SYSTEM_PROMPT;
  }
  else if (sessionType === "prompt-bookmark-title") {
    return BOOKMARK_SUMMARY_TITLE_SYSTEM_PROMPT;
  }
  else if (sessionType === "prompt-basic-json") {
    return BASIC_JSON_SYSTEM_PROMPT;
  }
  else if (sessionType === "prompt-code") {
    return CODE_SYSTEM_PROMPT;
  }
  else if (sessionType === "prompt-generate-bookmarks-json") {
    return GENERATE_BOOKMARKS_JSON_SYSTEM_PROMPT;
  }
  else {
    throw new Error(`Unsupported session type: ${sessionType}`);
  }
}