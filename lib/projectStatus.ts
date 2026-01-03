// lib/projectStatus.ts

export type ProjectStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FUNDING"
  | "COMPLETED"
  | "BRIDGED"
  | "ARCHIVED";

export function normalizeProjectStatus(raw: unknown): ProjectStatus {
  const s = typeof raw === "string" ? raw : "";
  if (
    s === "DRAFT" ||
    s === "ACTIVE" ||
    s === "FUNDING" ||
    s === "COMPLETED" ||
    s === "BRIDGED" ||
    s === "ARCHIVED"
  ) {
    return s;
  }
  // 不明値が入っていた場合は DRAFT 扱いにフォールバック
  return "DRAFT";
}

// bridge を許可するステータスかどうか
export function canBridgeFromStatus(status: ProjectStatus): boolean {
  // 例: ゴール達成済みで "COMPLETED" のときのみブリッジを許可
  return status === "COMPLETED";
}
