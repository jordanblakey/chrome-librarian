type BackgroundState = {
  session?: LanguageModel;
  sessionController?: AbortController;
};

interface RuntimeMessage {
  payload?: string;
  type: "prompt" | "response" | "new-session";
  status?: "success" | "failure";
  latencyMs?: number;
}
