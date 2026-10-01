#!/bin/zsh
# The daily reminder in the iPhone app, end to end (LucidaUITests/ReminderTests.swift): picking a time asks the phone to send notices (then,
# not when the app opens) and schedules one notice a day saying "Time to review your cards"; another time sets it again; Off and signing
# out remove it; and saying no leaves the row Off with a line on how to allow notices. Each flow needs a phone that has never been asked
# about notices, so the app is taken off the simulator before each one (the test puts it back). It starts web/server.mjs on PORT (3879) with
# an empty data folder, runs the flows on a simulator, prints each check, and stops the server.
#   ios/tools/e2e-reminder.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                                  ONLY=ReminderTests/test2Refused runs just that flow)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3879}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
SIM=${1:-booted}
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
TOTALS=$(mktemp)
for t in ${(s:,:)${ONLY:-ReminderTests/test1Allowed,ReminderTests/test2Refused}}; do
  xcrun simctl uninstall $SIM cards.lucida.app >/dev/null 2>&1
  TEST_RUNNER_LUCIDA_REMINDER=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
  xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-reminder} \
    -only-testing:LucidaUITests/$t 2>&1 | tee ${DATA}test-${t:t}.log | grep -E "^  (ok|FAIL) |^Reminder|error:|\*\* TEST" | tee -a $TOTALS | grep -vE "^Reminder: |^\*\* TEST"
done
awk '/^Reminder: [0-9]+ passed, [0-9]+ failed/ { p += $2; f += $4 } END { printf "Reminder: %d passed, %d failed\n", p, f }' $TOTALS
grep -q "^\*\* TEST FAILED" $TOTALS && echo "** TEST FAILED **"
exit 0
