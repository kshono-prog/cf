export const WORKSPACE_VIEWS = [
  "daily-work",
  "project",
  "ai-office",
  "fans",
  "manage",
  // backward compat — kept in union so existing URLs resolve without error
  "settings",
] as const;

export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

export function isWorkspaceView(value: string): value is WorkspaceView {
  return WORKSPACE_VIEWS.includes(value as WorkspaceView);
}

// Legacy URL segment → new WorkspaceView (backward compat)
const LEGACY_VIEW_MAP: Record<string, WorkspaceView> = {
  home: "daily-work",
  supporters: "daily-work",
  "support-page": "manage",
  public: "manage",
  advanced: "manage",
  settings: "manage",
};

export function resolveWorkspaceView(
  value: string | string[] | undefined | null
): WorkspaceView {
  if (Array.isArray(value)) {
    return resolveWorkspaceView(value[0]);
  }

  if (!value) return "daily-work";
  if (isWorkspaceView(value)) {
    // Treat legacy "settings" segment as "manage"
    if (value === "settings") return "manage";
    return value;
  }
  return LEGACY_VIEW_MAP[value] ?? "daily-work";
}
