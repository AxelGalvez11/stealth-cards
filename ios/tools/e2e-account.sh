#!/bin/zsh
# What Apple asks every app with accounts to have inside it, in the iPhone app, end to end (LucidaUITests/AccountTests.swift): taps
# through the app as made-up people on a fresh copy of the server on this Mac. Someone saves a password in Settings and signs in with it
# on the sign-in screen; someone blocks a person from their profile's ⋯ and a suggestion's Block, sees them in Settings › Account ›
# Blocked people, and unblocks; someone disconnects an AI app; someone deletes their account and is back at the sign-in screen. It starts
# web/server.mjs on SERVER_PORT (3877) and, in front of it, a small stand-in (ios/tools/password-proxy.mjs) on PORT (3875) that asks
# for a sign-in when nobody is signed in and takes passwords, as the real server does online; runs the test on a simulator, prints each
# check, and stops both.
#   ios/tools/e2e-account.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free;
#                                                 ONLY=AccountTests/test4DisconnectApp,AccountTests/test5DeleteAccount runs just those flows)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3875}
SERVER_PORT=${SERVER_PORT:-3877}
for p in $PORT $SERVER_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> SERVER_PORT=<another>."; exit 1; fi
done
DATA=$(mktemp -d)/
STEALTH_DATA=$DATA PORT=$SERVER_PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$SERVER_PORT/ && break; sleep 0.2; done
node ios/tools/password-proxy.mjs $PORT $SERVER_PORT > ${DATA}proxy.log 2>&1 &
PROXY=$!
trap "kill $SERVER $PROXY 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_ACCOUNT), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-AccountTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_ACCOUNT=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-account} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Account|error:|\*\* TEST"
