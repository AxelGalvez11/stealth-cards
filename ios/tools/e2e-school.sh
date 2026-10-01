#!/bin/zsh
# Finding decks by school, level, and subject in the iPhone app, end to end (LucidaUITests/SchoolTests.swift): taps through the app as
# made-up people on a fresh copy of the server on this Mac. Edit profile (a level, a school searched in the list, a year, and the switch
# for showing them: off to start with; a high school student has no school), a public deck's labels in Deck settings → Sharing, and
# Discover's Level, Subject, and School filters with the "Popular at" row. It starts web/server.mjs on PORT (3955) with an empty data
# folder, runs the test on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-school.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                                ONLY=SchoolTests/test3Discover runs just that flow)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3955}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_SCHOOL), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-SchoolTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_SCHOOL=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-school} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^School|error:|\*\* TEST"
