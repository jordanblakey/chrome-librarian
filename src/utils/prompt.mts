import { backgroundState } from '../background.mjs';
import { TEXT_SCHEMA, GENERATE_BOOKMARKS_JSON_SCHEMA } from '../data/responseConstraintSchemas.mjs';

export async function promptFromMessage(
  message: RuntimeMessagePrompt): Promise<void> {
  console.debug("[promptFromMessage] message.payload:", message.payload);
  if (backgroundState.session) {
    
    const startTime = performance.now();
    const inputUsage = backgroundState.session.inputUsage;

    // Prompt the LanguageModel
    let response = "";
    try {
      // handle streaming response
      if (message.streaming) {
        const stream = await backgroundState.session.promptStreaming(message.payload, {
          signal: backgroundState.sessionController?.signal,
          responseConstraint: await getResponseConstraintSchema(backgroundState.sessionType!)
        });
        console.debug("[promptFromMessage] created stream:", stream)
        let responseMessage: RuntimeMessageResponse = { type: "response-streaming" };
        for await (const chunk of stream) {
          // console.debug("[promptFromMessage] streaming chunk:", chunk);
          response += chunk;
          // console.debug("[promptFromMessage] response:", response);
          responseMessage = {
            type: "response-streaming",
            payload: response,
            latencyMs: Math.round(performance.now() - startTime),
            promptInputUsage: "streaming...",
            isFinal: false
          };
          chrome.runtime.sendMessage(responseMessage);
        }
        responseMessage.isFinal = true;
        responseMessage.promptInputUsage = `${backgroundState.session.inputUsage - inputUsage}`;
        chrome.runtime.sendMessage(responseMessage);
      } else {
        // handle non-streaming response
        response = await backgroundState.session.prompt(message.payload, {
          responseConstraint: await getResponseConstraintSchema(backgroundState.sessionType!),
          signal: backgroundState.sessionController?.signal,
        });
        chrome.runtime.sendMessage({
          type: "response",
          payload: response,
          latencyMs: Math.round(performance.now() - startTime),
          promptInputUsage: `${backgroundState.session.inputUsage - inputUsage}`,
        });
      }

    } catch (error) {
      console.debug("Prompt error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      chrome.runtime.sendMessage({
        payload: "Failed to prompt: " + errorMessage,
        type: "response",
        status: "failure",
        latencyMs: Math.round(performance.now() - startTime)
      });
    }

    chrome.runtime.sendMessage({
      type: "session-stats",
      sessionType: backgroundState.sessionType,
      inputUsage: backgroundState.session.inputUsage,
      inputQuota: backgroundState.session.inputQuota,
    });
  } else {
    chrome.runtime.sendMessage({
      type: "response",
      payload: "Language model session not initialized.",
      status: "failure",
    });
  }
}

export async function getResponseConstraintSchema(sessionType: SessionType): Promise<any> {
  let responseConstraintSchema: object;
  if (sessionType === "prompt-text") {
    responseConstraintSchema = TEXT_SCHEMA;
  }
  else if (sessionType === "prompt-generate-bookmarks-json") {
    responseConstraintSchema = GENERATE_BOOKMARKS_JSON_SCHEMA;
  }
  else {
    throw new Error("Unsupported session type: " + sessionType);
  }

  const inputUsage = await backgroundState.session!.measureInputUsage(responseConstraintSchema);
  console.debug("[getResponseConstraintSchema] schema input usage:", inputUsage);

  return responseConstraintSchema;
}