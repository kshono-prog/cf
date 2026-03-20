// app/api/creator/avatar/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { StorageError } from "@supabase/storage-js";
import { errJson, jsonResponse } from "@/lib/api/responses";
import { getAvatarUploadEnv } from "@/lib/env";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";

const avatarUploadEnv = getAvatarUploadEnv();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawAddress = formData.get("address");
    const file = formData.get("file");

    if (typeof rawAddress !== "string" || !(file instanceof File)) {
      return jsonResponse(
        {
          ok: false,
          error: "INVALID_PAYLOAD",
          detail: "address と file が必要です",
        },
        400
      );
    }

    const walletAddress = rawAddress.toLowerCase().trim();
    const ownerSession = await requireOwnerSession(req, walletAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const supabase = createClient(
      avatarUploadEnv.supabaseUrl,
      avatarUploadEnv.supabaseServiceKey
    );

    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${walletAddress}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avataricon")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      const err = uploadError as StorageError;

      console.error("SUPABASE_UPLOAD_ERROR", err);

      return jsonResponse(
        {
          ok: false,
          error: "UPLOAD_FAILED",
          detail: err.message,
          name: err.name, // これだけで OK
        },
        500
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avataricon").getPublicUrl(path);

    return jsonResponse({ url: publicUrl });
  } catch (e) {
    console.error("AVATAR_UPLOAD_ERROR", e);
    return errJson(
      "AVATAR_UPLOAD_FAILED",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
