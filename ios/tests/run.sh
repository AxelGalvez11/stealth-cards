#!/bin/zsh
# Checks for the iPhone app's Pro study tools (exam dates, pausing cards, Tune to you, deep stats).
#
#   ios/tests/run.sh parity
#       The app's Swift ports against the web app's own code (web/db.js, fsrs.js, sched.js, insights.js, tune.js), on a seeded
#       library and on made-up variations of it: exam dates near and far, goals, piles, FSRS off, paused and waiting cards.
#       Same numbers to 1e-9 (the tune fit to 1e-6). The Guide's engine (web/guide.js in JavaScriptCore) answers like node on the web's own cases (guide-check.sh).
#       Needs node and swiftc; no simulator.
#   ios/tests/run.sh e2e [pause exam grade learn tune free]
#       The app in the simulator against a local server on a fresh copy of the seeded library, through the app's own code
#       (App/DebugChecks.swift, run with -check <name>): pausing a card, an exam date, the time a grade sends, Learn mode's
#       log, Tune to you, and the Free app. DEVICE=<simulator id> is needed; PORT (default 3699) is the test server's.
#
#   ios/tests/run.sh xcode
#       The server taking purchases from Xcode's StoreKit test store (what the iPhone app's UI tests buy with), and only when
#       told to: on the module and over HTTP against two local servers (ports PORT and PORT + 1, default 3905). No simulator.
#
#   ios/tests/run.sh signin
#       Sign in with Apple from the iPhone app (audience cards.lucida.app, the web's is cards.lucida.web) against the real server and
#       a pretend Supabase: the server forwards the token and nonce and has no list of its own; the list that decides is Supabase's
#       (Apple "Client IDs", which hold both ids). Ports PORT and PORT + 1 (default 3907). No simulator.
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
  swiftc -O -o $W/parity $DATA/Models.swift $DATA/MakeModels.swift $DATA/DiagramLayout.swift $DATA/Rich.swift $DATA/FSRS.swift $DATA/Sched.swift $DATA/Tune.swift $DATA/Insights.swift $DATA/Engine.swift $H/swift/stubs.swift $H/swift/main.swift 2>&1 | grep -E "error" && return 1
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
  say "the Guide's engine against node (the web test's 341 texts, the toolbar, Enter and Tab; the app's guide.js is web/guide.js)" "$(TESTDIR=$TESTDIR $H/guide-check.sh 2>&1 | grep -E 'Guide parity|differs from' | head -1)"
  say "the mind map layout against node (414 trees: every box and link, and the count of ideas)" "$(TESTDIR=$TESTDIR $H/diagram-check.sh 2>&1 | grep -E 'Diagram layout' | sed -E 's/every one the same as node/0 differ/' | head -1)"
  echo; [[ $bad -eq 0 ]] && echo "parity: every check agrees" || { echo "parity: $bad checks differ"; return 1 }
}

e2e() {
  local D=${DEVICE:?set DEVICE to a simulator id (xcrun simctl list devices)} PORT=${PORT:-3699} W=$TESTDIR/e2e; mkdir -p $W
  seed
  (cd $REPO/ios && xcodebuild -project Lucida.xcodeproj -scheme Lucida -destination "id=$D" -configuration Debug -derivedDataPath $W/dd build -quiet 2>&1 | grep -E "error:" | sort -u | head -20)
  # A fresh install: nothing left over from another test (a made-up person still signed in, say).
  xcrun simctl uninstall $D cards.lucida.app >/dev/null 2>&1
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
    local extra=(-dev none); [[ $c == free ]] && extra=(-dev freeamy)   # (none: not whoever a UI test last signed in as)
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
  xcode) node $H/js/xcode-purchase.mjs ${PORT:-3905} ;;
  signin) node $H/js/apple-signin.mjs ${PORT:-3907} ;;
  parity) parity ;;
  e2e) shift; e2e "$@" ;;
  *) sed -n '2,15p' $0 ;;
esac
