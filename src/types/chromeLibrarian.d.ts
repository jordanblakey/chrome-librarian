
type SessionType = "prompt-text" | "prompt-generate-bookmarks-json";

type BackgroundState = {
  session?: LanguageModel;
  sessionController?: AbortController;
  sessionType?: SessionType;
};

type OptionsState = {
  promptInput?: HTMLTextAreaElement;
  promptButton?: HTMLButtonElement;
  streamingCheckbox?: HTMLInputElement;
  stopResponseButton?: HTMLButtonElement;
  copyButton?: HTMLButtonElement;
  newSessionTypeSelect?: HTMLSelectElement;
  newSessionButton?: HTMLButtonElement;
  sessionStatsDiv?: HTMLDivElement;
  responseStatus?: HTMLSpanElement;
  outputDiv?: HTMLDivElement;
};

interface RuntimeMessage {
  payload?: string;
  type: "prompt" | "response" | "response-streaming" | "stop-streaming" | "new-session" | "session-stats";
  sessionType?: SessionType;
  status?: "success" | "failure";
}

interface RuntimeMessageSessionStats extends RuntimeMessage {
  sessionType?: SessionType;
  inputUsage?: number;
  inputQuota?: number;
}

interface RuntimeMessageResponse extends RuntimeMessage {
  latencyMs?: number;
  promptInputUsage?: string;
  isFinal?: boolean;
}

interface RuntimeMessagePrompt extends RuntimeMessage {
  streaming?: boolean;
}
