#!/bin/zsh
# Profile in the tab bar and Connect AI inside Settings, end to end (LucidaUITests/NavTests.swift): taps through the app as
# made-up people on a fresh copy of the server on this Mac. The tab bar has Library, Discover, Stats and Profile (no Today, no
# Connect), and the app opens on the Library; News is the bell in Discover's header; Profile opens your own profile and is lit there,
# and someone else's profile lights no tab; Settings' row says Connect AI and opens the page, which has a back button and no tab
# bar; and the Library's empty state and `-open connect` open the same page. It starts web/server.mjs on PORT (3850) with an empty data folder, runs the test on a
# simulator, prints each check, and stops the server.
#   ios/tools/e2e-nav.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                             ONLY=NavTests/test3OtherWaysToConnectAI runs just that flow)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3850}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_NAV), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-NavTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_NAV=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-nav} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Nav:|error:|\*\* TEST"
