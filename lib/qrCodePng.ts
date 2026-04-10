type QRCodeModule = {
  toBuffer(
    text: string,
    options?: {
      type?: "png";
      width?: number;
      margin?: number;
      errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      color?: {
        dark?: string;
        light?: string;
      };
    }
  ): Promise<Buffer>;
};

// `qrcode` is present in the current runtime tree, but does not ship TS types.
// Keep the dependency boundary local so callers stay strongly typed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require("qrcode") as QRCodeModule;

const QR_CODE_WIDTH_PX = 320;
const QR_CODE_CACHE_CONTROL =
  "public, max-age=300, s-maxage=900, stale-while-revalidate=3600";

export async function renderQrCodePng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: "png",
    width: QR_CODE_WIDTH_PX,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111827",
      light: "#FFFFFFFF",
    },
  });
}

export function applyQrCodePngResponseHeaders(
  headers: Headers,
  vary?: string | null
): void {
  headers.set("Content-Type", "image/png");
  headers.set("Cache-Control", QR_CODE_CACHE_CONTROL);
  if (vary) {
    headers.set("Vary", vary);
  }
}
