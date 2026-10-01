#!/bin/zsh
# Lucida's own Learn mode questions in the iPhone app, end to end (LucidaUITests/QuizTests.swift): taps through the app as made-up
# people on a fresh copy of the server on this Mac, with a pretend OpenRouter (ios/tools/stub-openrouter.mjs, which writes one question
# for each numbered card it is sent) and a second server that has no AI. Learn mode starts at once with its own builders' questions while
# the AI is writing, asks for 20 cards as it starts, the questions are saved on the cards marked as Lucida's, and a written question comes
# up; a Free person whose batches are used, and a server with no AI, go on with the builders and nothing is asked. It starts the server on
# PORT (3944, with the AI), the pretend OpenRouter on STUB_PORT (3945), and the server with no AI on OFF_PORT (3946), each on an empty data
# folder, runs the test on a simulator, prints each check, and stops them.
#   ios/tools/e2e-quiz.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free;
#                                              ONLY=QuizTests/test2FreeBatchesUsed runs just that flow; SHOTS=<folder> saves pictures)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3944}; STUB_PORT=${STUB_PORT:-3945}; OFF_PORT=${OFF_PORT:-3946}
for p in $PORT $STUB_PORT $OFF_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> STUB_PORT=<another> OFF_PORT=<another>."; exit 1; fi
done
DATA=$(mktemp -d)/
mkdir -p ${DATA}on ${DATA}off
STUB_PORT=$STUB_PORT node ios/tools/stub-openrouter.mjs > ${DATA}stub.log 2>&1 &
STUB=$!
OPENROUTER_API_KEY=stub OPENROUTER_BASE=http://127.0.0.1:$STUB_PORT/api/v1 STEALTH_DATA=${DATA}on/ PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
env -u OPENROUTER_API_KEY STEALTH_DATA=${DATA}off/ PORT=$OFF_PORT node web/server.mjs > ${DATA}off.log 2>&1 &
OFF=$!
trap "kill $STUB $SERVER $OFF 2>/dev/null" EXIT
for p in $PORT $STUB_PORT $OFF_PORT; do for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$p/ && break; sleep 0.2; done; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_QUIZ), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-QuizTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
env TEST_RUNNER_LUCIDA_QUIZ=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_STUB=http://127.0.0.1:$STUB_PORT TEST_RUNNER_LUCIDA_OFF=http://127.0.0.1:$OFF_PORT ${SHOTS:+TEST_RUNNER_SHOTS=$SHOTS} \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-quiz} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Quiz|error:|\*\* TEST"
