#!/bin/zsh
# The iPhone app's study network, end to end (LucidaUITests/StudyNetworkTests.swift): taps through the app as made-up
# people on a fresh copy of the server on this Mac. It starts web/server.mjs on PORT (3677) with an empty data folder,
# runs the test on a simulator, prints each check, and stops the server.
#   ios/tools/e2e.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3677}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test learns the server's address from its environment (a build setting on the command line doesn't reach it).
TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e} \
  TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Study network|error:|\*\* TEST"
