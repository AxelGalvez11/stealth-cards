#!/bin/zsh
# Settings › Studying › Flip animation in the iPhone app, end to end (LucidaUITests/FlipTests.swift): the switch is On to start with; turning
# it Off saves it with the other study settings and the card's other side just appears in Review (no turn); it is kept across opening the
# app again and follows a change made on another device (the web). It starts web/server.mjs on PORT (3881) with an empty data folder,
# runs the flows on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-flip.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                              ONLY=FlipTests/test2OtherDevice runs just that flow; SHOTS=<folder> saves pictures)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3881}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_FLIP), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-FlipTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_FLIP=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_SHOTS=${SHOTS:-} \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-flip} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Flip|error:|\*\* TEST"
exit 0
