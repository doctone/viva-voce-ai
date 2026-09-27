#!/usr/bin/env bash
# Launch, inspect, drive and tear down a Viva Voce AI instance for verification.
# Usage: verify.sh <up|doctor|login|ab|shot|sql|down> [args]
# Run state and evidence live in <repo>/.verify/<run-id>/ (gitignored).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
VERIFY_DIR="$REPO_ROOT/.verify"
API_URL="http://127.0.0.1:54321"
DB_CONTAINER="supabase_db_viva-voce-ai"
SEED_EMAIL="will@viva-voce.org"
SEED_PASSWORD="password-will"

die() { echo "FAIL: $*" >&2; exit 1; }

# The run id comes from VERIFY_RUN_ID, else the run `up` last started.
resolve_run() {
  RUN_ID="${VERIFY_RUN_ID:-}"
  if [[ -z "$RUN_ID" && -f "$VERIFY_DIR/current" ]]; then
    RUN_ID="$(cat "$VERIFY_DIR/current")"
  fi
  [[ -n "$RUN_ID" ]] || die "no run found. Start one with: verify.sh up"
  RUN_DIR="$VERIFY_DIR/$RUN_ID"
  [[ -d "$RUN_DIR" ]] || die "run dir $RUN_DIR does not exist"
  PORT="$(cat "$RUN_DIR/port")"
  APP_URL="http://localhost:$PORT"
  SESSION="vv-$RUN_ID"
}

sql() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -At -c "$1"
}

supabase_up() {
  curl -sf -o /dev/null -m 5 "$API_URL/auth/v1/health"
}

env_points_local() {
  grep -q '^SUPABASE_URL=http://127.0.0.1:54321$' "$REPO_ROOT/apps/web/.env" 2>/dev/null
}

cmd_up() {
  command -v agent-browser >/dev/null || die "agent-browser is not installed"
  command -v docker >/dev/null || die "docker is not installed"
  env_points_local || die "apps/web/.env must set SUPABASE_URL=http://127.0.0.1:54321; refusing to drive a remote project"

  local port="${VERIFY_PORT:-3100}"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    die "port $port is already in use. Pick another with VERIFY_PORT=<port>"
  fi

  RUN_ID="${VERIFY_RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
  RUN_DIR="$VERIFY_DIR/$RUN_ID"
  mkdir -p "$RUN_DIR/evidence"
  echo "$port" > "$RUN_DIR/port"
  echo "$RUN_ID" > "$VERIFY_DIR/current"

  if supabase_up; then
    echo "Supabase already running; this run will leave it up."
  else
    echo "Starting local Supabase..."
    if ! (cd "$REPO_ROOT/packages/database" && pnpm exec supabase start >"$RUN_DIR/supabase-start.log" 2>&1); then
      # A crashed stack leaves exited containers that block `start`; a
      # plain `stop` keeps the data volume and clears them.
      echo "supabase start failed; clearing stale containers and retrying once."
      (cd "$REPO_ROOT/packages/database" && pnpm exec supabase stop >>"$RUN_DIR/supabase-start.log" 2>&1) || true
      (cd "$REPO_ROOT/packages/database" && pnpm exec supabase start >>"$RUN_DIR/supabase-start.log" 2>&1) \
        || die "supabase start failed, see $RUN_DIR/supabase-start.log"
    fi
    touch "$RUN_DIR/started-supabase"
  fi

  # Job control gives the dev server its own process group, so `down`
  # can kill pnpm, vite and workerd together without touching anything else.
  set -m
  (cd "$REPO_ROOT/apps/web" && exec pnpm exec vite dev --port "$port" --strictPort) \
    >"$RUN_DIR/vite.log" 2>&1 &
  echo $! > "$RUN_DIR/vite.pgid"
  set +m

  echo "Waiting for http://localhost:$port/login ..."
  for _ in $(seq 1 120); do
    if curl -sf -o /dev/null -m 60 "http://localhost:$port/login"; then
      echo "READY run=$RUN_ID url=http://localhost:$port evidence=$RUN_DIR/evidence"
      return 0
    fi
    kill -0 "$(cat "$RUN_DIR/vite.pgid")" 2>/dev/null || die "dev server exited, see $RUN_DIR/vite.log"
    sleep 1
  done
  die "dev server not ready after 120s, see $RUN_DIR/vite.log"
}

cmd_doctor() {
  resolve_run
  local failed=0
  check() {
    if (eval "$2") >/dev/null 2>&1; then echo "OK   $1"; else echo "FAIL $1"; failed=1; fi
  }
  local pgid; pgid="$(cat "$RUN_DIR/vite.pgid" 2>/dev/null || true)"

  echo "run=$RUN_ID url=$APP_URL session=$SESSION"
  echo "build=$(git -C "$REPO_ROOT" rev-parse --short HEAD)$(git -C "$REPO_ROOT" diff --quiet || echo '+dirty') branch=$(git -C "$REPO_ROOT" branch --show-current)"
  check "dev server process group $pgid is alive" "[[ -n '$pgid' ]] && kill -0 '$pgid'"
  check "port $PORT is owned by this run" \
    "for p in \$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t); do [[ \$(ps -o pgid= -p \$p | tr -d ' ') == '$pgid' ]] && exit 0; done; exit 1"
  check "$APP_URL/login answers 200" "curl -sf -o /dev/null -m 60 '$APP_URL/login'"
  check "apps/web/.env points at local Supabase" env_points_local
  check "local Supabase auth is healthy" supabase_up
  check "seed user $SEED_EMAIL exists" "[[ \$(sql \"select count(*) from auth.users where email = '$SEED_EMAIL'\") == 1 ]]"
  echo "data: $(sql "select count(*) from public.students") students, $(sql "select count(*) from public.submissions") submissions"
  return "$failed"
}

cmd_ab() {
  resolve_run
  agent-browser --session "$SESSION" "$@"
}

cmd_login() {
  resolve_run
  local ab=(agent-browser --session "$SESSION")
  "${ab[@]}" open "$APP_URL/login" >/dev/null
  # Submitting before hydration falls back to a native GET that puts the
  # password in the URL and never logs in.
  "${ab[@]}" wait --fn "Object.keys(document.querySelector('form') || {}).some((k) => k.startsWith('__reactFiber'))" >/dev/null
  "${ab[@]}" find label "Email" fill "$SEED_EMAIL" >/dev/null
  "${ab[@]}" find label "Password" fill "$SEED_PASSWORD" >/dev/null
  "${ab[@]}" find role button click --name "Log in" >/dev/null
  "${ab[@]}" wait --fn "location.pathname === '/submissions'" >/dev/null \
    || die "login did not reach /submissions; current url: $("${ab[@]}" get url)"
  echo "Logged in as $SEED_EMAIL in session $SESSION"
}

cmd_shot() {
  resolve_run
  local name="${1:?usage: verify.sh shot <name>}"
  local out="$RUN_DIR/evidence/$name"
  agent-browser --session "$SESSION" screenshot --full "$out.png" >/dev/null
  agent-browser --session "$SESSION" snapshot > "$out.aria.txt"
  agent-browser --session "$SESSION" get url > "$out.url.txt"
  echo "$out.png"
  echo "$out.aria.txt"
}

cmd_sql() {
  sql "${1:?usage: verify.sh sql <query>}"
}

cmd_down() {
  resolve_run
  agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
  if [[ -f "$RUN_DIR/vite.pgid" ]]; then
    local pgid; pgid="$(cat "$RUN_DIR/vite.pgid")"
    kill -TERM -- "-$pgid" 2>/dev/null || true
    for _ in $(seq 1 10); do kill -0 -- "-$pgid" 2>/dev/null || break; sleep 1; done
    kill -KILL -- "-$pgid" 2>/dev/null || true
    rm -f "$RUN_DIR/vite.pgid"
  fi
  if [[ -f "$RUN_DIR/started-supabase" ]]; then
    (cd "$REPO_ROOT/packages/database" && pnpm exec supabase stop >/dev/null 2>&1) || true
    rm -f "$RUN_DIR/started-supabase"
    echo "Stopped the Supabase stack this run started."
  fi
  if [[ "$(cat "$VERIFY_DIR/current" 2>/dev/null)" == "$RUN_ID" ]]; then
    rm -f "$VERIFY_DIR/current"
  fi
  echo "Torn down run $RUN_ID. Evidence kept in $RUN_DIR/evidence"
}

case "${1:-}" in
  up | doctor | login | ab | shot | sql | down)
    cmd="$1"; shift; "cmd_$cmd" "$@" ;;
  *)
    echo "usage: verify.sh <up|doctor|login|ab|shot|sql|down> [args]" >&2
    exit 2 ;;
esac
