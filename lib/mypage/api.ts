// /lib/mypage/api.ts
// Barrel re-exporter — implementation has been split by domain.
// All existing import sites continue to work without changes.

export {
  fetchMe,
  fetchMyPageDashboard,
  saveMyPageUser,
  requestCreatorApply,
  updateMyPageCreatorProfile,
  ensureCreatorProfileQrCode,
} from "@/lib/mypage/profileApi";

export type {
  MyPageProjectRecord,
} from "@/lib/mypage/projectApi";

export {
  hydrateMyPageProjectRecord,
  fetchProjectSummary,
  fetchMyPageProject,
  createMyPageProject,
  updateMyPageProject,
  saveProjectGoal,
  achieveProjectGoal,
  createProject,
} from "@/lib/mypage/projectApi";

export {
  fetchProjectSettlement,
  recomputeProjectSettlement,
  recordProjectSettlementBridge,
  saveProjectSettlementDistributions,
  saveProjectSettlementDistributionResult,
  saveProjectDistributionPlan,
  saveProjectDistributionResult,
  runProjectCctpAction,
  prepareProjectBridge,
  saveProjectBridgeRun,
  reverifyProjectBridge,
} from "@/lib/mypage/settlementApi";

export {
  fetchGasEligibility,
  fetchGasNonce,
  claimGasSupport,
} from "@/lib/mypage/gasApi";
