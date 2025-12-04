type BackgroundState = {
  session?: LanguageModel;
  sessionController?: AbortController;
};

interface RuntimeMessage {
  payload: string;
  type: "prompt" | "response";
  status?: "success" | "failure";
}
