#!/bin/zsh
# Asking about a card in Explain (the composer under the explanation: Review and Learn mode), end to end
# (LucidaUITests/AskTests.swift): taps through the app as made-up people on a fresh copy of the server on this Mac, whose AI is the stand-in
# ios/tools/explain-stub.mjs (it writes explanations and answers questions about the card). It starts web/server.mjs on PORT (3976) with an
# empty data folder and the stand-in on AIPORT (3977), runs the test on a simulator, prints each check, and stops both.
#   ios/tools/e2e-ask.sh [simulator id]      (DD=<folder> keeps the build somewhere else; ONLY=AskTests/test2FreeCountsDownToTheUpgradeLine runs
#                                             one flow; SHOTS=<folder> saves a picture when a check fails)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3976}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
AIPORT=${AIPORT:-3977}
if lsof -nP -iTCP:$AIPORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $AIPORT is busy: stop what's on it, or run with AIPORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STUB_PORT=$AIPORT node ios/tools/explain-stub.mjs > ${DATA}stub.log 2>&1 &
STUB=$!
STEALTH_DATA=$DATA PORT=$PORT OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:$AIPORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER $STUB 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$AIPORT/__count && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17"}
# The test only runs when asked to (LUCIDA_ASK), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-AskTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_ASK=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_AI=http://127.0.0.1:$AIPORT TEST_RUNNER_SHOTS=${SHOTS:-} \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-ask} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL|·) |^Ask:|error:|\*\* TEST"
