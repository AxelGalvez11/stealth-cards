#!/bin/zsh
# A deck's Diagrams in the iPhone app, end to end (LucidaUITests/DiagramsTests.swift): taps through the app as made-up people on a fresh copy of the server on this Mac, with the AI
# stood in for (the stand-in answers what OpenRouter and Gemini would, so nothing real is asked and no key is needed). Before the test, ios/tests/js/diagrams-seed.mjs makes the owners the
# way the server does (a deck with eight cards, the lecture slides they were made from with the three diagrams the make finds, a table and a mind map made from the cards, an uploaded
# picture), and a shared deck with someone who studies it.
# The test checks: the Diagrams tab and its groups, tiles and empty state; a lecture picture (its labels, Show boxes), Make cards into the card editor (a box and an answer for each label,
# a card for each box once saved, the cards keeping their picture when the diagram is deleted); Rename and Delete (asked in the viewer, in Lucida's own words); Make diagram (Table or Mind
# map, from everything or a tag or a source, asked of the AI the way Explain asks, Redo, the AI failing and Try again, too few cards); the Free plan's limit; Upload (its own sheet, the
# picture in the Uploaded group, its labels read when cards are made from it); the Make flow's Image kind (the review's picture cards and where the diagrams are kept, a card for every
# label); a shared deck's page and a deck you study (only the made diagrams, read only, none of the owner's lecture pictures); dark mode; that nothing says "AI generated"; and that no
# system alert, dialog or menu ever opens. It starts web/server.mjs on PORT (3908) with an empty data folder and the stand-in AI on STUB_PORT (3909), runs the test on a simulator,
# prints each check and a last line "Diagrams: N passed, M failed", and stops both.
#   ios/tools/e2e-diagrams.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free; SLOW is not used: the waits are long already;
#                                                  ONLY=DiagramsTests/test01Tab,DiagramsTests/test04MakeDiagram runs just those flows;
#                                                  SHOTS=<folder> saves a picture of the screen at the steps that take one (and whenever a check fails);
#                                                  STUB_AI=<stub-ai.mjs> points at the stand-in AI with Diagrams in it (it needs fixtures/figures.json beside it))
cd "${0:A:h}/../.." || exit 1
REPO=$PWD
PORT=${PORT:-3908}
STUB_PORT=${STUB_PORT:-3909}
for p in $PORT $STUB_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> STUB_PORT=<another>."; exit 1; fi
done
# The stand-in AI (a small server that answers like OpenRouter and Gemini; it logs every question, at /__log). It needs the Diagrams answers (the seeing model's pictures, tables and mind maps).
for c in "$STUB_AI" $REPO/web/tests/stub-ai.mjs /private/tmp/claude-501/-Users-axelgalvez-Desktop/6699752a-0f05-4258-bb01-dd0bf041ec39/scratchpad/full/diagrams/tests/stub-ai.mjs; do
  [[ -n "$c" && -f "$c" ]] && grep -q "schemaName === 'diagrams'" "$c" && { STUB=$c; break; }
done
[[ -n "$STUB" ]] || { echo "No stand-in AI with Diagrams in it found: run with STUB_AI=<path to stub-ai.mjs>."; exit 1; }
FIX=${FIXTURES:-$REPO/ios/tests/fixtures}
DATA=$(mktemp -d)/
WT=$REPO STUB_PORT=$STUB_PORT node $STUB > ${DATA}stub.log 2>&1 &
STUB_PID=$!
STEALTH_DATA=$DATA PORT=$PORT OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:$STUB_PORT/api/v1 GEMINI_API_KEY=test GEMINI_BASE=http://127.0.0.1:$STUB_PORT \
  node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER $STUB_PID 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$STUB_PORT/__log && break; sleep 0.2; done
# The people and their diagrams (the test only taps through what is already there).
SERVER=http://127.0.0.1:$PORT STUB=http://127.0.0.1:$STUB_PORT FIXTURES=$FIX node ios/tests/js/diagrams-seed.mjs ${DATA}seed.json || { echo "The seed failed (see ${DATA}server.log)."; exit 1; }
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_DIAGRAMS), so the other scripts keep running their own checks alone.
[[ -n "$SHOTS" ]] && { mkdir -p $SHOTS; export TEST_RUNNER_SHOTS=$SHOTS; }
ONLYARGS=(); for t in ${(s:,:)${ONLY:-DiagramsTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_DIAGRAMS=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_STUB=http://127.0.0.1:$STUB_PORT TEST_RUNNER_LUCIDA_SEED=${DATA}seed.json TEST_RUNNER_LUCIDA_FIXTURES=$FIX \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-diagrams} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Diagrams:|error:|\*\* TEST"
