#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="${TMPDIR:-/tmp}/chrome-live-dashboard-${USER:-unknown}"
FILE_URL="file://${ROOT}/index.html"

launch_chrome() {
  local chrome_path="$1"
  shift
  "$chrome_path" \
    --user-data-dir="$PROFILE" \
    --disable-web-security \
    --disable-features=IsolateOrigins,site-per-process \
    "$FILE_URL" "$@" &
}

if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ -d "/Applications/Google Chrome.app" ]]; then
    open -na "Google Chrome" --args \
      --user-data-dir="$PROFILE" \
      --disable-web-security \
      --disable-features=IsolateOrigins,site-per-process \
      "$FILE_URL"
  elif [[ -d "/Applications/Chromium.app" ]]; then
    open -na "Chromium" --args \
      --user-data-dir="$PROFILE" \
      --disable-web-security \
      --disable-features=IsolateOrigins,site-per-process \
      "$FILE_URL"
  else
    echo "Google Chrome 또는 Chromium을 찾을 수 없습니다. README.md를 참고하세요." >&2
    exit 1
  fi
elif command -v google-chrome-stable >/dev/null 2>&1; then
  launch_chrome google-chrome-stable
elif command -v google-chrome >/dev/null 2>&1; then
  launch_chrome google-chrome
elif command -v chromium >/dev/null 2>&1; then
  launch_chrome chromium
elif command -v chromium-browser >/dev/null 2>&1; then
  launch_chrome chromium-browser
else
  echo "Chrome/Chromium 실행 파일을 찾을 수 없습니다. README.md의 수동 실행 방법을 사용하세요." >&2
  exit 1
fi

echo "라이브 대시보드를 열었습니다: $FILE_URL"
echo "프로필 디렉터리(임시): $PROFILE"
