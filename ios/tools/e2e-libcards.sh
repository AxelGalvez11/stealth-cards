#!/bin/zsh
# The owner's comments of 2026-10-02 in the iPhone app, end to end (LucidaUITests/LibraryCardsTests.swift): All cards without its Difficulty
# control (tags, decks and the search still filter, each row still says how hard its card is), Stats' Hardest cards without See all (Keep
# forgetting's See them still opens All cards), Deck settings with Name right under the Header section and no deck tags, and New deck with
# its name typed on the cover (no Name, Tags or Grade with). It starts web/server.mjs on PORT (3886) with an empty data folder, runs the flows
# on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-libcards.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                                  ONLY=LibraryCardsTests/test2StatsHardest runs just that flow; SHOTS=<folder> keeps pictures)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3886}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_LIBCARDS), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-LibraryCardsTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_LIBCARDS=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_SHOTS=${SHOTS:-} \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-libcards} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^LibraryCards|error:|\*\* TEST"
exit 0
