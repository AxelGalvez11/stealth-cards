#!/bin/zsh
# How the iPhone app's make-cards flow talks to the server (Data/MakeData.swift, like web/make.js), where the simulator's end to end test can't
# reach: every part asked for once and three at a time, a part that fails tried again twice (a bad file isn't), the server's own words and
# code, a 401, Cancel (even while it's starting), a file going where it's told (this server's path with the cookie, the storage's address
# with its headers and no cookie), what's saved, and the rules for what can be picked. The app's own code is compiled for this Mac and run
# against a stand-in server (js/make-server.mjs); also how a long recording picked from Files is cut into parts of at most ten minutes (the
# parts are made here, by AVFoundation, from sounds the check writes itself) and the recorder's ten-minute files. Needs node and swiftc;
# no simulator; a few minutes (cutting takes a while).
#   ios/tests/make-check.sh
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/make; mkdir -p $W; rm -f $W/port
DATA=$REPO/ios/Lucida/Data
swiftc -O -D DEBUG -o $W/make-check $DATA/Models.swift $DATA/MakeModels.swift $DATA/Rich.swift $DATA/FSRS.swift $DATA/Sched.swift $DATA/Tune.swift $DATA/Insights.swift $DATA/Engine.swift \
  $DATA/API.swift $DATA/Upload.swift $DATA/MakeData.swift $DATA/MakeSplit.swift $DATA/MakeRecorder.swift $H/swift/stubs.swift $H/swift/make/main.swift 2>&1 | grep -E "error:" && exit 1
PORTFILE=$W/port node $H/js/make-server.mjs > $W/server.log 2>&1 &
SERVER=$!
trap "kill $SERVER 2>/dev/null" EXIT
for i in {1..50}; do [[ -s $W/port ]] && break; sleep 0.1; done
[[ -s $W/port ]] || { echo "the stand-in server didn't start"; exit 1; }
$W/make-check -server http://127.0.0.1:$(cat $W/port) -fixtures $H/fixtures
