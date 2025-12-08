
type SessionType = "prompt-text" | "prompt-bookmark-title" | "prompt-basic-json" | "prompt-code" | "prompt-generate-bookmarks-json";

type BackgroundState = {
  session?: LanguageModel;
  sessionController?: AbortController;
  sessionType?: SessionType;
};

type OptionsState = {
  sessionType?: SessionType;
  promptInput?: HTMLTextAreaElement;
  isShiftDown?: boolean;
  promptButton?: HTMLButtonElement;
  streamingCheckbox?: HTMLInputElement;
  stopResponseButton?: HTMLButtonElement;
  copyButton?: HTMLButtonElement;
  tokenEstimate?: HTMLSpanElement;
  newSessionTypeSelect?: HTMLSelectElement;
  newSessionButton?: HTMLButtonElement;
  transcriptDiv?: HTMLDivElement;
  outputDiv?: HTMLDivElement;
  responseStatus?: HTMLSpanElement;
  statsDiv?: HTMLDivElement;
  sessionStatsDiv?: HTMLDivElement;
};

type PromptOptions = {
  signal?: AbortSignal;
  responseConstraint?: any;
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
