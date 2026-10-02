#!/bin/zsh
# The Library as the app's first page, end to end (LucidaUITests/HomeTests.swift): the four tabs and the Library opening first, with nothing to make
# cards (no Make box, row or due line; its + is New deck and Import cards), a deck's page (Make cards and New card on its cover, no tiles, Practice
# test or exam line, its tabs Sources, Cards, Notes, Diagrams right under Flashcards and Learn, and its Make cards set to it), an empty deck, New deck,
# a brand-new account's three tiles, no Classes anywhere (a class still on the server shows nothing), News in Discover's header, and a folder's page. It starts web/server.mjs on PORT (3953) with an empty
# data folder and the stand-in AI on STUB_PORT (3954), runs the test on a simulator, prints each check, and stops both.
#   ios/tools/e2e-home.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free;
#                                              ONLY=HomeTests/test2Deck runs just that flow; STUB_AI=<stub-ai.mjs> points at the stand-in;
#                                              TEST_RUNNER_SHOTS=<folder> keeps a picture of each page it checks and of each failure)
cd "${0:A:h}/../.." || exit 1
REPO=$PWD
PORT=${PORT:-3953}
STUB_PORT=${STUB_PORT:-3954}
for p in $PORT $STUB_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> STUB_PORT=<another>."; exit 1; fi
done
for c in "$STUB_AI" $REPO/web/tests/stub-ai.mjs $REPO/ios/tools/stub-ai.mjs /private/tmp/claude-501/-Users-axelgalvez-Desktop/6699752a-0f05-4258-bb01-dd0bf041ec39/scratchpad/full/materials/tests/stub-ai.mjs; do
  [[ -n "$c" && -f "$c" ]] && { STUB=$c; break; }
done
[[ -n "$STUB" ]] || { echo "No stand-in AI found: run with STUB_AI=<path to stub-ai.mjs>."; exit 1; }
DATA=$(mktemp -d)/
WT=$REPO STUB_PORT=$STUB_PORT node $STUB > ${DATA}stub.log 2>&1 &
STUB_PID=$!
STEALTH_DATA=$DATA PORT=$PORT OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:$STUB_PORT/api/v1 GEMINI_API_KEY=test GEMINI_BASE=http://127.0.0.1:$STUB_PORT \
  node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER $STUB_PID 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$STUB_PORT/__log && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_HOME), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-HomeTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_HOME=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-home} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Home:|error:|\*\* TEST"
