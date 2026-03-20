#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${MEASURE_BASE_URL:-http://127.0.0.1:3000}"
PATHS_RAW="${MEASURE_PATHS:-/kazu,/kazu/home,/kazu/search,/kazu/events}"
WARM_RUNS="${MEASURE_WARM_RUNS:-2}"

if ! [[ "$WARM_RUNS" =~ ^[0-9]+$ ]] || [[ "$WARM_RUNS" -lt 1 ]]; then
  echo "PUBLIC_SURFACE_MEASUREMENT_FAILED"
  echo "Invalid MEASURE_WARM_RUNS: ${WARM_RUNS}"
  exit 1
fi

to_ms() {
  awk -v seconds="$1" 'BEGIN { printf "%.1f", seconds * 1000 }'
}

measure_request() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code} %{size_download} %{time_total}" --max-time 30 "$url"
}

IFS=',' read -r -a PATHS <<< "$PATHS_RAW"

echo "# public surface measurement"
echo "base_url=${BASE_URL}"
echo "paths=${PATHS_RAW}"
echo "warm_runs=${WARM_RUNS}"
echo ""

for path in "${PATHS[@]}"; do
  local_path="$(echo "$path" | xargs)"
  if [[ -z "$local_path" ]]; then
    continue
  fi

  url="${BASE_URL%/}${local_path}"
  read -r cold_status cold_bytes cold_seconds <<< "$(measure_request "$url")"
  if [[ "$cold_status" -lt 200 || "$cold_status" -ge 300 ]]; then
    echo "PUBLIC_SURFACE_MEASUREMENT_FAILED"
    echo "Request failed for ${local_path}: HTTP ${cold_status}"
    exit 1
  fi

  warm_sum="0"
  warm_min=""
  warm_max="0"

  for (( index=0; index<WARM_RUNS; index+=1 )); do
    read -r warm_status _ warm_seconds <<< "$(measure_request "$url")"
    if [[ "$warm_status" -lt 200 || "$warm_status" -ge 300 ]]; then
      echo "PUBLIC_SURFACE_MEASUREMENT_FAILED"
      echo "Warm request failed for ${local_path}: HTTP ${warm_status}"
      exit 1
    fi

    warm_sum="$(awk -v a="$warm_sum" -v b="$warm_seconds" 'BEGIN { printf "%.6f", a + b }')"
    if [[ -z "$warm_min" ]]; then
      warm_min="$warm_seconds"
    else
      warm_min="$(awk -v a="$warm_min" -v b="$warm_seconds" 'BEGIN { printf "%.6f", (a < b ? a : b) }')"
    fi
    warm_max="$(awk -v a="$warm_max" -v b="$warm_seconds" 'BEGIN { printf "%.6f", (a > b ? a : b) }')"
  done

  warm_avg="$(awk -v total="$warm_sum" -v count="$WARM_RUNS" 'BEGIN { printf "%.6f", total / count }')"

  printf "%-16s  cold=%7sms  warm_avg=%7sms  warm_min=%7sms  warm_max=%7sms  bytes=%s\n" \
    "$local_path" \
    "$(to_ms "$cold_seconds")" \
    "$(to_ms "$warm_avg")" \
    "$(to_ms "$warm_min")" \
    "$(to_ms "$warm_max")" \
    "$cold_bytes"
done
