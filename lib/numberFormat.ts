export function formatReadableNumber(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    lessThanForTiny?: boolean;
  }
): string {
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 6;
  const lessThanForTiny = options?.lessThanForTiny ?? true;

  if (!Number.isFinite(value) || value <= 0) {
    return minimumFractionDigits > 0 ? (0).toFixed(minimumFractionDigits) : "0";
  }

  const minVisible = 1 / 10 ** maximumFractionDigits;
  if (lessThanForTiny && value < minVisible) {
    return `< ${minVisible.toFixed(maximumFractionDigits)}`;
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function formatBigIntGrouped(value: bigint): string {
  const s = value.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

