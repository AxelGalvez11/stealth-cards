#!/bin/zsh
# Practice tests in the iPhone app, end to end (LucidaUITests/PracticeTestTests.swift): taps through the app as made-up people
# on a fresh copy of the server on this Mac. Someone sets up a test (lengths, kinds, a time limit), takes it (numbers, back,
# flags, the list of questions, Submit asking about unanswered ones), sees the results (the score, the time, every question),
# retakes the ones they missed, and finds the past results on the deck page; written answers forgive small typos and the
# wrong ones offer Count it as right; the missed cards can be studied right away; matching, fill in the blank, a timed test
# that runs out, a test open again where it was after the app closed, leaving, and a folder's test are checked too; and a test
# never changes a card's schedule or logs a review. It starts web/server.mjs on PORT (3947) with an empty data folder, runs
# the test on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-test.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                              ONLY=PracticeTestTests/test4ClockAndLeave runs just that flow; SHOTS=<folder> saves pictures)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3947}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_PRACTICE), so ios/tools/e2e.sh keeps running the study network's checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-PracticeTestTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
env TEST_RUNNER_LUCIDA_PRACTICE=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT ${SHOTS:+TEST_RUNNER_SHOTS=$SHOTS} \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-test} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Practice test|error:|\*\* TEST"
