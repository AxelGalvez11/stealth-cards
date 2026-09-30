#!/bin/zsh
# The iPhone app's themes, end to end (LucidaUITests/ThemesTests.swift): taps through the app as made-up people on a fresh copy
# of the server on this Mac. It starts web/server.mjs on PORT (3688) with an empty data folder, makes the person whose Pro
# lapsed (their library still has a theme; they're on Free), runs the test on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-themes.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3688}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
up() { for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && return 0; sleep 0.2; done; return 1 }
# The first server makes the library of the person whose Pro lapsed, then stops, and their file gets Frutiger Aero.
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server0.log 2>&1 &
S0=$!
up && node ios/tools/themes-lapsed.mjs make http://127.0.0.1:$PORT freelapse
sleep 1.5; kill $S0 2>/dev/null; wait $S0 2>/dev/null
node ios/tools/themes-lapsed.mjs edit ${DATA%/} freelapse
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
up || { echo "The server didn't start: see ${DATA}server.log"; exit 1; }
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test finds the server through LUCIDA_SERVER: xcodebuild hands the test runner its TEST_RUNNER_ variables.
TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -only-testing:LucidaUITests/ThemesTests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e} 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Themes|error:|\*\* TEST"
