#!/bin/zsh
# Nothing the phone draws itself (the owner, 2026-10-01), end to end in the iPhone app (LucidaUITests/OwnUITests.swift): the questions are Lucida's own sheet,
# Settings' lists and the language of made cards are Lucida's list sheet, a deck's exam date opens Lucida's calendar, Take a photo opens
# Lucida's camera screen, a failed save says so in a quiet message, and no page shows the system's navigation bar, a toolbar, an alert or a menu. It starts
# web/server.mjs on PORT (3993) with an empty data folder, and a stand-in in front of it on PROXYPORT (3995) that fails every save while a file exists, runs the
# test on a simulator, prints each check and a last line "Own UI: N passed, M failed", and stops both by PID.
#   ios/tools/e2e-ownui.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free; ONLY=OwnUITests/test4Camera runs just that flow;
#                                               SHOTS=<folder> saves a picture of the screen whenever a check fails, and of the screens it names)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3993}
PROXYPORT=${PROXYPORT:-3995}
for p in $PORT $PROXYPORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> PROXYPORT=<another>."; exit 1; fi
done
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
TARGET=http://127.0.0.1:$PORT PORT=$PROXYPORT FAIL_FLAG=${DATA}fail node ios/tools/fail-proxy.mjs > ${DATA}proxy.log 2>&1 &
PROXY=$!
trap "kill $SERVER $PROXY 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$PROXYPORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17"}
[[ -n "$SHOTS" ]] && { mkdir -p $SHOTS; export TEST_RUNNER_SHOTS=$SHOTS; }
# The test only runs when asked to (LUCIDA_OWNUI), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-OwnUITests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_OWNUI=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_PROXY=http://127.0.0.1:$PROXYPORT TEST_RUNNER_LUCIDA_FAIL_FLAG=${DATA}fail \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-ownui} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Own UI:|error:|\*\* TEST"
