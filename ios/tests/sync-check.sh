#!/bin/zsh
# How the iPhone app opens when the server is slow or goes wrong (Data/API.swift syncedState, like the web's readState): the
# library with the decks you study brought up to date gets 8 seconds, then the app takes the library as it is; a 401 still
# means signed out. The app's own code is compiled for this Mac and asked against a stand-in server (js/sync-server.mjs) that
# is slow, trickles, errors, drops the connection, or says signed out. Needs node and swiftc; no simulator; about 50 seconds.
#   ios/tests/sync-check.sh
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/sync; mkdir -p $W; rm -f $W/port
DATA=$REPO/ios/Lucida/Data
swiftc -O -D DEBUG -o $W/sync-check $DATA/Models.swift $DATA/MakeModels.swift $DATA/DiagramLayout.swift $DATA/Rich.swift $DATA/FSRS.swift $DATA/Sched.swift $DATA/Tune.swift $DATA/Insights.swift $DATA/Engine.swift \
  $DATA/API.swift $DATA/Upload.swift $H/swift/stubs.swift $H/swift/sync/main.swift 2>&1 | grep -E "error" && exit 1
PORTFILE=$W/port node $H/js/sync-server.mjs > $W/server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do [[ -s $W/port ]] && break; sleep 0.1; done
[[ -s $W/port ]] || { echo "the stand-in server didn't start"; exit 1; }
$W/sync-check -server http://127.0.0.1:$(cat $W/port)
