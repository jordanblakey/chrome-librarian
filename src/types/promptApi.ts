interface LanguageModel {
  inputQuota: number;
  inputUsage: number;
  onquotaoverflow: null | CallableFunction;
  temperature: number;
  topK: number;
  availability: "available" | "downloadable" | "downloading" | "unavailable";
  create: CallableFunction;
  prompt: CallableFunction;
  promptStreaming: CallableFunction;
}
