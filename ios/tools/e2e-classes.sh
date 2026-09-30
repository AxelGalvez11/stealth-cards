#!/bin/zsh
# The iPhone app's classes and schools, end to end (LucidaUITests/ClassesTests.swift): taps through the app as made-up
# people on a fresh copy of the server on this Mac: a teacher makes a class, adds and assigns a deck, students join with the
# code (one shares their progress, one doesn't), study, and Today lists the assignment; then reports, Get verified (the
# made-up person "admin" approves it), helpers, leaving, taking people out, and deleting the class. It starts web/server.mjs
# on PORT (3733) with an empty data folder, runs the test on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-classes.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3733}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_CLASSES), so ios/tools/e2e.sh keeps running the study network's checks alone.
TEST_RUNNER_LUCIDA_CLASSES=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-classes} \
  -only-testing:LucidaUITests/ClassesTests 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Classes|error:|\*\* TEST"
