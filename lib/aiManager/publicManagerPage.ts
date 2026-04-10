import { cache } from "react";

import type { PublicSupportActionTheme } from "@/lib/aiManager/supportActionThemes";
import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import type { SerializedPublicAiManagerProfile } from "@/lib/serializers/aiManager";
import type { SerializedPublicAiManagerSupportActivity } from "@/lib/serializers/aiManager";
import { loadPublicProfilePageReadModel } from "@/lib/publicProfilePageReadModel";
import {
  getActiveSupportProject,
  type SupportProfileView,
  type SupportProjectView,
} from "@/lib/supportProfileView";

type PublicAiManagerPageData = {
  creator: Awaited<
    ReturnType<typeof loadPublicProfilePageReadModel>
  >["pageData"]["creator"];
  profile: Awaited<
    ReturnType<typeof loadPublicProfilePageReadModel>
  >["pageData"]["profile"];
  aiManager: SerializedPublicAiManagerProfile;
  supportProfileView: SupportProfileView;
  activeSupportProject: SupportProjectView | null;
  recruitingProjects: SupportProjectView[];
  credibility: CreatorActivityCredibility;
  recentSupportActivities: SerializedPublicAiManagerSupportActivity[];
  supportActionThemes: PublicSupportActionTheme[];
};

export const loadPublicAiManagerPageData = cache(
  async (
    creatorUsername: string,
    managerSlug: string
  ): Promise<PublicAiManagerPageData | null> => {
    const publicReadModel = await loadPublicProfilePageReadModel(creatorUsername);
    const aiManager = publicReadModel.pageData.publicAiManager;
    if (!aiManager || aiManager.slug !== managerSlug) return null;

    return {
      creator: publicReadModel.pageData.creator,
      profile: publicReadModel.pageData.profile,
      aiManager,
      supportProfileView: publicReadModel.pageData.supportProfileView,
      activeSupportProject: getActiveSupportProject(
        publicReadModel.pageData.supportProfileView
      ),
      recruitingProjects: publicReadModel.pageData.recruitingProjects,
      credibility: publicReadModel.credibility,
      recentSupportActivities: publicReadModel.pageData.recentSupportActivities,
      supportActionThemes: publicReadModel.pageData.supportActionThemes,
    };
  }
);
