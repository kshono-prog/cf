export const WORKSPACE_VIEWS = [
  "home",
  "support-page",
  "supporters",
  "public",
  "advanced",
] as const;

export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

export function isWorkspaceView(value: string): value is WorkspaceView {
  return WORKSPACE_VIEWS.includes(value as WorkspaceView);
}

export function resolveWorkspaceView(
  value: string | string[] | undefined | null
): WorkspaceView {
  if (Array.isArray(value)) {
    return resolveWorkspaceView(value[0]);
  }

  return value && isWorkspaceView(value) ? value : "home";
}
