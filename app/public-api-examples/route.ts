import {
  PUBLIC_CREATOR_API_EXAMPLE,
  PUBLIC_VIEWER_CONNECTED_EXAMPLE,
  PUBLIC_VIEWER_EMPTY_EXAMPLE,
} from "@/lib/publicApiExamples";

export async function GET(): Promise<Response> {
  return Response.json(
    {
      publicCreatorApi: PUBLIC_CREATOR_API_EXAMPLE,
      publicViewerApi: {
        connected: PUBLIC_VIEWER_CONNECTED_EXAMPLE,
        empty: PUBLIC_VIEWER_EMPTY_EXAMPLE,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
