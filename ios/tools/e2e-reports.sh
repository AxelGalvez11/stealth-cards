#!/bin/zsh
# Report, Check this deck, and Get verified in the iPhone app, end to end (LucidaUITests/ReportsTests.swift): taps through
# the app as made-up people on a fresh copy of the server on this Mac. Someone reports a shared deck, a person, and a
# suggestion and sees the thanks (and the server's own words when it says no: your own deck, too many reports waiting);
# someone asks to be verified in Settings, the made-up person "admin" approves it, and they see Verified teacher, check
# someone else's deck ("Checked by you", and the button is back once the owner changes the deck); a helper of a community
# deck opens a suggestion from News and lands on Suggestions; and the library still opens when the server is slow to bring
# your decks up to date (a small stand-in server holds the sync for 12 seconds). It starts web/server.mjs on PORT (3844)
# with an empty data folder and the stand-in on PROXY_PORT (3846), runs the test on a simulator, prints each check, and
# stops both.
#   ios/tools/e2e-reports.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free;
#                                                 ONLY=ReportsTests/test6SlowSync,ReportsTests/test5HelperNews runs just those flows)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3844}
PROXY_PORT=${PROXY_PORT:-3846}
for p in $PORT $PROXY_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> PROXY_PORT=<another>."; exit 1; fi
done
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
# (The server's address first: in a prefix assignment, PORT= would already be the stand-in's when TARGET= is worked out.)
SERVER_URL=http://127.0.0.1:$PORT
PORT=$PROXY_PORT TARGET=$SERVER_URL node ios/tools/slow-sync-proxy.mjs > ${DATA}proxy.log 2>&1 &
PROXY=$!
trap "kill $SERVER $PROXY 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PROXY_PORT/__proxy/log && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_REPORTS), so ios/tools/e2e.sh keeps running the study network's checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-ReportsTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_REPORTS=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_SLOW=http://127.0.0.1:$PROXY_PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-reports} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Reports|error:|\*\* TEST"
