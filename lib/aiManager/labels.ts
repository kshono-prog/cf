import type { SerializedAiManagerPaymentAttemptEvent } from "@/lib/serializers/aiManager";

export function getCapabilityLabel(capability: string): string {
  switch (capability) {
    case "POST_DRAFTING":
      return "投稿下書き";
    case "FAN_REPLY_ASSIST":
      return "ファン返信補助";
    case "PROGRESS_SUMMARY":
      return "進捗サマリー";
    case "WEB_RESEARCH":
      return "Web情報収集";
    default:
      return capability;
  }
}

export function getSourceLabel(
  source: SerializedAiManagerPaymentAttemptEvent["source"]
): string {
  switch (source) {
    case "BILLING_SYSTEM":
      return "billing system";
    case "OWNER_REVIEW":
      return "owner review";
    case "X402_CONNECTOR":
      return "x402 connector";
  }
}
