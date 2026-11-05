#!/usr/bin/env bash
# Called INSIDE existing capture/score workflows; no additional cron or service.
set -euo pipefail
mode="$1"
test "$mode" = "picks" -o "$mode" = "final" || { echo "INVALID_RENDER_MODE"; exit 2; }
test "$GITHUB_ACTIONS" = "true" || { echo "GITHUB_ACTIONS_ONLY"; exit 2; }
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
for attempt in 1 2 3 4; do
  git fetch origin main
  git reset --hard origin/main
  set +e
  python3 scripts/render-quiniela-season.py --mode "$mode" --eligible
  status=$?
  set -e
  if [ "$status" = 2 ]; then
    echo "PMX_AUTO_RENDER_WAITING_OR_ALREADY_CERTIFIED $mode"
    exit 0
  fi
  test "$status" = 0 || { echo "::error::Renderer eligibility check failed"; exit 1; }
  python3 -m pip install --disable-pip-version-check --quiet Pillow==11.3.0
  python3 scripts/render-quiniela-season.py --self-test
  python3 scripts/render-quiniela-season.py --mode "$mode"
  node scripts/refresh-quiniela-assets.mjs
  git add -- quiniela-control/figma-week-*.json quiniela-control/exports/asset-index.json \
    quiniela-control/exports/w*-picks-board.png \
    quiniela-control/exports/w*-results-final.png \
    quiniela-control/exports/w*-ranking-weekly.png \
    quiniela-control/exports/w*-ranking-season.png
  if git diff --cached --quiet;then
    echo "PMX_AUTO_RENDER_SOURCE_ALREADY_PERSISTED $mode"
    exit 0
  fi
  git commit -m "Quiniela: verified Figma auto-render $mode [skip ci]"
  if git push origin HEAD:main;then
    echo "PMX_AUTO_RENDER_PERSISTED_TO_MAIN $mode"
    exit 0
  fi
  echo "::warning::Main advanced while rendering $mode; refreshing authentic sources"
  sleep 5
done
echo "::error::Figma-backed private renderer could not persist after 4 optimistic retries"
exit 1
