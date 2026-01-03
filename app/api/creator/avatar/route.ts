// app/api/creator/avatar/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { StorageError } from "@supabase/storage-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const rawAddress = formData.get("address");
    const file = formData.get("file");

    if (typeof rawAddress !== "string" || !(file instanceof File)) {
      return NextResponse.json(
        { error: "INVALID_PAYLOAD", detail: "address と file が必要です" },
        { status: 400 }
      );
    }

    const walletAddress = rawAddress.toLowerCase().trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error: "SUPABASE_ENV_MISSING",
          detail:
            "NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません。",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      return NextResponse.json(
        {
          error: "UPLOAD_FAILED",
          detail: err.message,
          name: err.name, // これだけで OK
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avataricon").getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error("AVATAR_UPLOAD_ERROR", e);
    return NextResponse.json(
      {
        error: "AVATAR_UPLOAD_FAILED",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
