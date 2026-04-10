import {
  buildCreatorProfilePublicUrl,
  buildCreatorProfileQrCodePath,
  isReusableCreatorProfileQrCodeUrl,
} from "@/lib/profileQrCode";
import {
  applyQrCodePngResponseHeaders,
  renderQrCodePng,
} from "@/lib/qrCodePng";

export type CreatorProfileQrCodePersistence = {
  qrcodeUrl: string;
  reused: boolean;
  shouldPersist: boolean;
};

const QR_CODE_VARY_HEADER = "Host, X-Forwarded-Host, X-Forwarded-Proto";

export function resolveCreatorProfileQrCodePersistence(args: {
  username: string;
  currentQrcodeUrl: string | null | undefined;
  force?: boolean;
}): CreatorProfileQrCodePersistence {
  const qrcodeUrl = buildCreatorProfileQrCodePath(args.username);
  const reused =
    args.force !== true &&
    isReusableCreatorProfileQrCodeUrl(args.currentQrcodeUrl, args.username);

  return {
    qrcodeUrl,
    reused,
    shouldPersist: !reused,
  };
}

export function buildCreatorProfileQrTargetUrl(args: {
  username: string;
  baseUrl: string;
}): string {
  return buildCreatorProfilePublicUrl(args.username, args.baseUrl);
}

export async function renderCreatorProfileQrCodePng(args: {
  username: string;
  baseUrl: string;
}): Promise<Buffer> {
  const targetUrl = buildCreatorProfileQrTargetUrl(args);

  return renderQrCodePng(targetUrl);
}

export function applyCreatorProfileQrCodeResponseHeaders(headers: Headers): void {
  applyQrCodePngResponseHeaders(headers, QR_CODE_VARY_HEADER);
}
