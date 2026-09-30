#!/bin/zsh
# Checks for the iPhone app's Pro study tools (exam dates, pausing cards, Tune to you, deep stats).
#
#   ios/tests/run.sh parity
#       The app's Swift ports against the web app's own code (web/db.js, fsrs.js, sched.js, insights.js, tune.js), on a seeded
#       library and on made-up variations of it: exam dates near and far, goals, piles, FSRS off, paused and waiting cards.
#       Same numbers to 1e-9 (the tune fit to 1e-6). Needs node and swiftc; no simulator.
#   ios/tests/run.sh e2e [pause exam grade learn tune free]
#       The app in the simulator against a local server on a fresh copy of the seeded library, through the app's own code
#       (App/DebugChecks.swift, run with -check <name>): pausing a card, an exam date, the time a grade sends, Learn mode's
#       log, Tune to you, and the Free app. DEVICE=<simulator id> is needed; PORT (default 3699) is the test server's.
#
# Everything it makes goes in a folder of its own under the temp folder (TESTDIR to move it).
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; mkdir -p $TESTDIR
DATA=$REPO/ios/Lucida/Data

seed() {  # a library of four decks, 440 cards and five months of reviews, in $TESTDIR/seed
  [[ -f $TESTDIR/seed/stealth-cards.json ]] || WT=$REPO node $H/js/seed.mjs $TESTDIR/seed > /dev/null
}

parity() {
  seed
  local W=$TESTDIR/parity; rm -rf $W; mkdir -p $W/variants
  local S=$TESTDIR/seed/stealth-cards.json NOW=$(node -e 'console.log(Date.now())')
  swiftc -O -o $W/parity $DATA/Models.swift $DATA/FSRS.swift $DATA/Sched.swift $DATA/Tune.swift $DATA/Insights.swift $DATA/Engine.swift $H/swift/stubs.swift $H/swift/main.swift 2>&1 | grep -E "error" && return 1
  local bad=0
  say() { echo "$1: $2"; [[ $2 == *" 0 differ"* ]] || bad=$((bad+1)); }
  WT=$REPO node $H/js/oracle-dump.mjs $S $NOW $W/js.json > /dev/null && $W/parity $S $NOW $W/swift.json > /dev/null
  say "the seeded library (decks, Today, Stats, the queue, All cards, deep stats, exam lines)" "$(node $H/js/compare.mjs $W/js.json $W/swift.json | head -1)"
  node $H/js/variants.mjs $S $W/variants ${VARIANTS:-12} $NOW > /dev/null
  for i in $(seq 0 $((${VARIANTS:-12}-1))); do
    local n=$(cat $W/variants/v$i.now)
    WT=$REPO node $H/js/oracle-dump.mjs $W/variants/v$i.json $n $W/variants/v$i.js.json > /dev/null && $W/parity $W/variants/v$i.json $n $W/variants/v$i.swift.json > /dev/null
    say "variation $i" "$(node $H/js/compare.mjs $W/variants/v$i.js.json $W/variants/v$i.swift.json | head -1)"
  done
  WT=$REPO node $H/js/fsrs-js.mjs make $W/fsrs-in.json > /dev/null; WT=$REPO node $H/js/fsrs-js.mjs $W/fsrs-in.json $W/fsrs-js.json > /dev/null; $W/parity fsrs $W/fsrs-in.json $W/fsrs-swift.json > /dev/null
  say "FSRS grades, 4000 random cards with standard and tuned parameters" "$(node $H/js/compare.mjs $W/fsrs-js.json $W/fsrs-swift.json 1e-9 | head -1)"
  WT=$REPO node $H/js/tune-js.mjs $S $W/tune-js.json > /dev/null; $W/parity tune $S $W/tune-swift.json > /dev/null
  say "the Tune to you fit (19 numbers, loss, gain)" "$(node $H/js/compare.mjs $W/tune-js.json $W/tune-swift.json 1e-6 | head -1)"
  echo; [[ $bad -eq 0 ]] && echo "parity: every check agrees" || { echo "parity: $bad checks differ"; return 1 }
}

e2e() {
  local D=${DEVICE:?set DEVICE to a simulator id (xcrun simctl list devices)} PORT=${PORT:-3699} W=$TESTDIR/e2e; mkdir -p $W
  seed
  (cd $REPO/ios && xcodebuild -project Lucida.xcodeproj -scheme Lucida -destination "id=$D" -configuration Debug -derivedDataPath $W/dd build -quiet 2>&1 | grep -E "error:" | sort -u | head -20)
  xcrun simctl install $D $W/dd/Build/Products/Debug-iphonesimulator/Lucida.app || return 1
  local checks=("$@"); [[ ${#checks} -eq 0 ]] && checks=(pause exam grade learn tune free)
  local pass=0 fail=0
  for c in $checks; do
    [[ -f $W/server.pid ]] && kill $(cat $W/server.pid) 2>/dev/null; sleep 0.6
    rm -rf $W/data; cp -R $TESTDIR/seed $W/data
    if [[ $c == free ]]; then   # a made-up person on the Free plan (the name starts with "free"), with a fit saved from when it was Pro
      mkdir -p $W/data/users
      node -e "const fs = require('fs'), S = JSON.parse(fs.readFileSync('$W/data/stealth-cards.json', 'utf8')); import('$REPO/web/fsrs.js').then(F => { S.settings.tune = { on: true, w: F.W.map((x, i) => i === 8 ? 2.2 : i === 10 ? 1.5 : x), n: 2000, reviews: 3000, at: Date.now(), loss: 0.4, base: 0.42, gain: 0.01 }; fs.writeFileSync('$W/data/users/freeamy.json', JSON.stringify(S)); });"
    fi
    (cd $REPO && STEALTH_DATA=$W/data/ PORT=$PORT nohup node web/server.mjs > $W/server.log 2>&1 & echo $! > $W/server.pid)
    for i in {1..30}; do grep -q "localhost:$PORT" $W/server.log 2>/dev/null && break; sleep 0.3; done
    xcrun simctl terminate $D cards.lucida.app >/dev/null 2>&1; rm -f $W/$c.out
    local extra=(); [[ $c == free ]] && extra=(-dev freeamy)
    (xcrun simctl launch --console $D cards.lucida.app -server http://127.0.0.1:$PORT $extra -check $c > $W/$c.out 2>&1 &)
    for i in {1..300}; do grep -q "CHECKS DONE" $W/$c.out 2>/dev/null && break; sleep 0.5; done
    grep -E "^CHECK" $W/$c.out | sed "s/^CHECK /[$c] /"
    local p=$(grep -c "^CHECK PASS" $W/$c.out) f=$(grep -c "^CHECK FAIL" $W/$c.out)
    grep -q "CHECKS DONE" $W/$c.out || { echo "[$c] the check didn't finish"; f=$((f+1)); }
    pass=$((pass+p)); fail=$((fail+f))
  done
  [[ -f $W/server.pid ]] && kill $(cat $W/server.pid) 2>/dev/null
  echo; echo "e2e: $pass passed, $fail failed"; [[ $fail -eq 0 ]]
}

case "$1" in
  parity) parity ;;
  e2e) shift; e2e "$@" ;;
  *) sed -n '2,15p' $0 ;;
esac
