// lib/api/project.ts
// Project-related API calls. No apiBase parameter.
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import {
  fetchMyPageProject as _fetchMyPageProject,
  createMyPageProject as _createMyPageProject,
  updateMyPageProject as _updateMyPageProject,
  fetchProjectSummary,
  fetchProjectSettlement,
  saveProjectGoal,
  achieveProjectGoal,
  recomputeProjectSettlement,
  saveProjectDistributionPlan,
  saveProjectDistributionResult,
  hydrateMyPageProjectRecord,
  type MyPageProjectRecord,
} from "@/lib/mypage/api";

export {
  fetchProjectSummary,
  fetchProjectSettlement,
  saveProjectGoal,
  achieveProjectGoal,
  recomputeProjectSettlement,
  saveProjectDistributionPlan,
  saveProjectDistributionResult,
  hydrateMyPageProjectRecord,
};
export type { MyPageProjectRecord };

export async function fetchMyPageProject(args: {
  projectId: string;
  ownerAddress: string;
}): ReturnType<typeof _fetchMyPageProject> {
  return _fetchMyPageProject(args);
}

export async function createMyPageProject(args: {
  ownerAddress: string;
  title: string;
  description: string | null;
  purposeMode: string;
  currency?: CurrencyCode;
}): ReturnType<typeof _createMyPageProject> {
  return _createMyPageProject(args);
}

export async function updateMyPageProject(args: {
  projectId: string;
  ownerAddress: string;
  title: string;
  description: string | null;
  purposeMode: string;
}): ReturnType<typeof _updateMyPageProject> {
  return _updateMyPageProject(args);
}
