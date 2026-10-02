#!/bin/zsh
# The owner's first TestFlight notes (no profile picture on the first page, Remove from folder, Share opening the share sheet, swiping
# between tabs and back, haptics, and the deck cover's parallax), end to end (LucidaUITests/PolishTests.swift): taps through the
# app as made-up people on a fresh copy of the server on this Mac. It starts web/server.mjs on PORT (3914) with an empty data
# folder, runs the test on a simulator, prints each check, and stops the server. It also lists the app's haptics.
#   ios/tools/e2e-polish.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports (PORT, AIPORT) must be free;
#                                                ONLY=PolishTests/test4SwipeToChangePages runs just that flow)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3914}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
AIPORT=${AIPORT:-3916}
if lsof -nP -iTCP:$AIPORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $AIPORT is busy: stop what's on it, or run with AIPORT=<another>."; exit 1; fi
echo "The app's haptics (every .haptic(...) and Buzz call):"
grep -rnE '\.haptic\(\.|Buzz\.shared\.(light|success|warning)\(' ios/Lucida --include='*.swift' | sed -E 's|^ios/Lucida/||' | grep -v '^Design/Haptics.swift' | sed -E 's|^([^:]+:[0-9]+):[[:space:]]*|  \1  |' | cut -c1-170
echo
DATA=$(mktemp -d)/
# The AI that writes explanations is a stand-in (ios/tools/explain-stub.mjs, on AIPORT), so Explain works without OpenRouter.
STUB_PORT=$AIPORT node ios/tools/explain-stub.mjs > ${DATA}stub.log 2>&1 &
STUB=$!
STEALTH_DATA=$DATA PORT=$PORT OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:$AIPORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER $STUB 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17"}
# The test only runs when asked to (LUCIDA_POLISH), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-PolishTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_POLISH=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_AI=http://127.0.0.1:$AIPORT TEST_RUNNER_SHOTS=${SHOTS:-} \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-polish} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL|·) |^Polish:|error:|\*\* TEST"
