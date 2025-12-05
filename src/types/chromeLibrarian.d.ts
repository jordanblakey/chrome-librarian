
type SessionType = "prompt-text" | "prompt-generate-bookmarks-json";

type BackgroundState = {
  session?: LanguageModel;
  sessionController?: AbortController;
  sessionType?: SessionType;
};

interface RuntimeMessage {
  payload?: string;
  type: "prompt" | "response" | "new-session";
  sessionType?: SessionType;
  status?: "success" | "failure";
  latencyMs?: number;
}
