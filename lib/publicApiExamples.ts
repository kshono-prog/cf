export const PUBLIC_CREATOR_API_EXAMPLE = {
  ok: true,
  creator: {
    username: "kazu",
    displayName: "Kazu",
    profile: "creator profile",
    avatarUrl: "/avatars/kazu.jpg",
    qrcode: null,
    url: "https://example.com",
    themeColor: "#005bbb",
    creatorType: "MUSICIAN",
    projectId: "10",
    projectIdsByCurrency: {
      JPYC: "10",
      USDC: "20",
    },
    latestProjectSummary: {
      projectId: "10",
      title: "Pinned project",
      currency: "JPYC",
      targetAmount: 1000,
      confirmedAmount: 250,
      progressPct: 25,
      achievedAt: null,
    },
  },
  projectId: "10",
  projectIdsByCurrency: {
    JPYC: "10",
    USDC: "20",
  },
  latestProjectSummary: {
    projectId: "10",
    title: "Pinned project",
    currency: "JPYC",
    targetAmount: 1000,
    confirmedAmount: 250,
    progressPct: 25,
    achievedAt: null,
  },
  summary: null,
  summariesByCurrency: {
    JPYC: null,
    USDC: null,
  },
} as const;

export const PUBLIC_VIEWER_EMPTY_EXAMPLE = {
  ok: true,
  hasUser: false,
  hasCreator: false,
  user: null,
  creator: null,
  projectId: null,
  projectIdsByCurrency: {
    JPYC: null,
    USDC: null,
  },
} as const;

export const PUBLIC_VIEWER_CONNECTED_EXAMPLE = {
  ok: true,
  hasUser: true,
  hasCreator: true,
  user: {
    username: "kazu",
    displayName: "Kazu",
    profile: "profile",
  },
  creator: {
    username: "kazu",
    displayName: "Kazu",
    profile: "creator profile",
    avatarUrl: "/avatars/kazu.jpg",
    qrcode: null,
    url: "https://example.com",
    themeColor: "#005bbb",
    creatorType: "MUSICIAN",
  },
  projectId: "project-1",
  projectIdsByCurrency: {
    JPYC: "project-1",
    USDC: null,
  },
} as const;
