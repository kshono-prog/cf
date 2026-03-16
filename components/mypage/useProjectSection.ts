"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CurrencyCode,
  SummaryProject,
} from "@/lib/mypage/accountPageTypes";
import {
  createMyPageProject,
  fetchMyPageProject,
  hydrateMyPageProjectRecord,
  updateMyPageProject,
  type MyPageProjectRecord,
} from "@/lib/mypage/api";

export type ProjectSectionMode = "VIEW" | "EDIT" | "CREATE";

type UseProjectSectionArgs = {
  ownerAddress: string;
  activeProjectId: string | null;
  initialProject?: SummaryProject | null;
  currency?: CurrencyCode;
  onActiveProjectIdChange?: (projectId: string, currency: CurrencyCode) => void;
};

function createEmptyCreateDraft() {
  return {
    title: "",
    description: "",
    purposeMode: "OPTIONAL",
  };
}

export function useProjectSection(args: UseProjectSectionArgs) {
  const {
    ownerAddress,
    activeProjectId,
    initialProject = null,
    currency = "JPYC",
    onActiveProjectIdChange,
  } = args;

  const [mode, setMode] = useState<ProjectSectionMode>(
    activeProjectId ? "VIEW" : "CREATE"
  );
  const [project, setProject] = useState<MyPageProjectRecord | null>(
    activeProjectId && initialProject?.id === activeProjectId
      ? hydrateMyPageProjectRecord(initialProject)
      : null
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purposeMode, setPurposeMode] = useState("OPTIONAL");
  const [creating, setCreating] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPurposeMode, setEditPurposeMode] = useState("OPTIONAL");
  const [saving, setSaving] = useState(false);

  const applyProject = useCallback((nextProject: MyPageProjectRecord) => {
    setProject(nextProject);
    setEditTitle(nextProject.title);
    setEditDescription(nextProject.description ?? "");
    setEditPurposeMode(nextProject.purposeMode);
  }, []);

  const resetCreateDraft = useCallback(() => {
    const empty = createEmptyCreateDraft();
    setTitle(empty.title);
    setDescription(empty.description);
    setPurposeMode(empty.purposeMode);
  }, []);

  useEffect(() => {
    setMode(activeProjectId ? "VIEW" : "CREATE");
  }, [activeProjectId]);

  const fetchProject = useCallback(
    async (projectId: string) => {
      setLoading(true);
      setMsg(null);

      try {
        const result = await fetchMyPageProject({
          projectId,
          ownerAddress,
        });
        if (!result.ok) {
          setProject(null);
          setMsg(result.error);
          return;
        }

        applyProject(result.data);
      } finally {
        setLoading(false);
      }
    },
    [applyProject, ownerAddress]
  );

  useEffect(() => {
    if (!activeProjectId) {
      setProject(null);
      return;
    }

    const hydratedInitialProject =
      initialProject && initialProject.id === activeProjectId
        ? hydrateMyPageProjectRecord(initialProject)
        : null;

    if (hydratedInitialProject) {
      applyProject(hydratedInitialProject);
      return;
    }

    if (project?.id === activeProjectId) {
      return;
    }

    void fetchProject(activeProjectId);
  }, [activeProjectId, applyProject, fetchProject, initialProject, project?.id]);

  const onCreate = useCallback(async () => {
    if (creating) return;

    setCreating(true);
    setMsg(null);

    try {
      const result = await createMyPageProject({
        ownerAddress,
        title,
        description: description.trim().length > 0 ? description : null,
        purposeMode,
        currency,
      });

      if (!result.ok) {
        setMsg(result.error);
        return;
      }

      if (result.project) {
        applyProject(result.project);
      }

      onActiveProjectIdChange?.(result.projectId, currency);
      setMsg(
        "新しい Project に切り替えました。Goal は Project ごとで、新ProjectはGoal未設定です（旧Goalは旧Projectに残ります）。"
      );
      resetCreateDraft();
      setMode("VIEW");
    } catch {
      setMsg("PROJECT_CREATE_FAILED");
    } finally {
      setCreating(false);
    }
  }, [
    applyProject,
    creating,
    currency,
    description,
    onActiveProjectIdChange,
    ownerAddress,
    purposeMode,
    resetCreateDraft,
    title,
  ]);

  const onSaveEdit = useCallback(async () => {
    if (!activeProjectId || saving) return;

    setSaving(true);
    setMsg(null);

    try {
      const result = await updateMyPageProject({
        projectId: activeProjectId,
        ownerAddress,
        title: editTitle,
        description: editDescription.trim().length > 0 ? editDescription : null,
        purposeMode: editPurposeMode,
      });

      if (!result.ok) {
        setMsg(result.error);
        return;
      }

      applyProject(result.data);
      setMode("VIEW");
      setMsg("更新しました");
    } catch {
      setMsg("PROJECT_UPDATE_FAILED");
    } finally {
      setSaving(false);
    }
  }, [
    activeProjectId,
    applyProject,
    editDescription,
    editPurposeMode,
    editTitle,
    ownerAddress,
    saving,
  ]);

  return {
    hasActive: !!activeProjectId,
    mode,
    setMode,
    project,
    loading,
    msg,
    createDraft: {
      title,
      setTitle,
      description,
      setDescription,
      purposeMode,
      setPurposeMode,
      creating,
      onCreate,
    },
    editDraft: {
      title: editTitle,
      setTitle: setEditTitle,
      description: editDescription,
      setDescription: setEditDescription,
      purposeMode: editPurposeMode,
      setPurposeMode: setEditPurposeMode,
      saving,
      onSave: onSaveEdit,
    },
  };
}
