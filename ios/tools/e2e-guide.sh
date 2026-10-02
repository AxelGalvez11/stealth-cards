#!/bin/zsh
# A deck's Guide and Sources in the iPhone app, end to end (LucidaUITests/GuideTests.swift): taps through the app as made-up people on a fresh copy of the server on this Mac,
# with the AI stood in for (the stand-in answers what OpenRouter and Gemini would, so nothing real is asked and no key is needed). Before the test, ios/tests/js/guide-seed.mjs
# makes the Sources the way the server does (a PDF, a recording kept as thirteen files, a video, pictures, pasted text, a topic) under a Guide with two extra pages.
# The test checks: a deck with no Guide offers "Add a guide"; typing in the editor saves by itself; each toolbar button's result, and Enter in a list; Preview draws the heading, table
# and task list and doesn't run or show a script, an onerror picture, a javascript: link or an outside picture; History and Restore (what it replaced is kept); extra pages (add, rename,
# write, delete asks first, ten at most); Make cards from the Guide (all of it, or what's selected); the Guide on the deck page (Show more and less, page tabs, Edit, Done lands on
# Notes); a deck you only study (the Guide with no editing, no Sources tab); the Sources list and each kind's viewer (a recording of thirteen files plays the part that covers the
# card's time, a PDF opens at its page, a video at the time); the card editor's "Made from" line; More cards from a source; Delete (asks first; the file goes, the cards stay); a shared
# deck's Guide and "Made from 2 sources"; the Add cards menu; dark mode; and that nothing says "AI generated". It starts web/server.mjs on PORT (3934) with an empty data folder and the
# stand-in AI on STUB_PORT (3939), runs the test on a simulator, prints each check and a last line "Guide: N passed, M failed", and stops both.
#   ios/tools/e2e-guide.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free; SLOW=3 waits three times as long as usual for what the app shows,
#                                               for a busy Mac (2 when not given); ONLY=GuideTests/test02Toolbar,GuideTests/test09Sources runs just those flows;
#                                               SHOTS=<folder> saves a picture of the screen whenever a check fails (and some others);
#                                               STUB_AI=<stub-ai.mjs> points at another copy of the stand-in)
cd "${0:A:h}/../.." || exit 1
REPO=$PWD
PORT=${PORT:-3934}
STUB_PORT=${STUB_PORT:-3939}
for p in $PORT $STUB_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> STUB_PORT=<another>."; exit 1; fi
done
# The stand-in AI (a small server that answers like OpenRouter and Gemini; it logs every question, at /__log).
for c in "$STUB_AI" $REPO/web/tests/stub-ai.mjs $REPO/ios/tools/stub-ai.mjs /private/tmp/claude-501/-Users-axelgalvez-Desktop/6699752a-0f05-4258-bb01-dd0bf041ec39/scratchpad/full/materials/tests/stub-ai.mjs; do
  [[ -n "$c" && -f "$c" ]] && { STUB=$c; break; }
done
[[ -n "$STUB" ]] || { echo "No stand-in AI found: run with STUB_AI=<path to stub-ai.mjs>."; exit 1; }
FIX=${FIXTURES:-$REPO/ios/tests/fixtures}
DATA=$(mktemp -d)/
WT=$REPO STUB_PORT=$STUB_PORT node $STUB > ${DATA}stub.log 2>&1 &
STUB_PID=$!
STEALTH_DATA=$DATA PORT=$PORT OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:$STUB_PORT/api/v1 GEMINI_API_KEY=test GEMINI_BASE=http://127.0.0.1:$STUB_PORT \
  node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER $STUB_PID 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$STUB_PORT/__log && break; sleep 0.2; done
# The people and the Sources (the test only taps through what is already there).
SERVER=http://127.0.0.1:$PORT STUB=http://127.0.0.1:$STUB_PORT FIXTURES=$FIX node ios/tests/js/guide-seed.mjs ${DATA}seed.json || { echo "The seed failed (see ${DATA}server.log)."; exit 1; }
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_GUIDE), so the other scripts keep running their own checks alone.
[[ -n "$SHOTS" ]] && { mkdir -p $SHOTS; export TEST_RUNNER_SHOTS=$SHOTS; }
ONLYARGS=(); for t in ${(s:,:)${ONLY:-GuideTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_SLOW=${SLOW:-2} TEST_RUNNER_LUCIDA_GUIDE=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_SEED=${DATA}seed.json TEST_RUNNER_LUCIDA_FIXTURES=$FIX \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-guide} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Guide:|error:|\*\* TEST"
