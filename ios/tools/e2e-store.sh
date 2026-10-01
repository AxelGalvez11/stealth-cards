#!/bin/zsh
# Go Pro with the App Store in the iPhone app, end to end (LucidaUITests/StoreTests.swift): the app buys with StoreKit's local test
# store (Lucida.storekit) and tells a fresh copy of the server on this Mac, started to take the test store's purchases
# (LUCIDA_APPLE_TEST_XCODE=1). A Free person buys monthly (Settings says Billed by Apple, the server agrees); Restore purchases
# finds one made elsewhere (and isn't fooled into giving it to someone else); Pro bought on the web says Billed on the web with
# nothing to buy or manage; with no subscriptions on the App Store it says so; every Go Pro opens the same sheet. It also checks
# that nothing in the app opens Stripe. It starts web/server.mjs on PORT (3871), runs the tests on a simulator, prints each check
# and one total, and stops the server. Restore purchases runs against a second fresh server: the test store counts its purchases
# from 0 again after each clearing, and the server keeps one row for each original purchase.
#   ios/tools/e2e-store.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the port must be free;
#                                               ONLY=StoreTests/test3BilledOnTheWeb,StoreTests/test4NotYet runs just those, on one server)
cd "${0:A:h}/../.." || exit 1
PORT=${PORT:-3871}
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $PORT is busy: stop what's on it, or run with PORT=<another>."; exit 1; fi
# The app never sends anyone to Stripe: its checkout and portal links aren't anywhere in it.
if grep -rnE "buy\.stripe\.com|billing\.stripe\.com|/pro\?plan|lucida\.cards/pricing" ios/Lucida --include='*.swift' | grep -v '^ios/Lucida/Design/Generated.swift' | grep -q .; then
  echo "  FAIL the app has a Stripe or pricing-page link"; grep -rnE "buy\.stripe\.com|billing\.stripe\.com|/pro\?plan|lucida\.cards/pricing" ios/Lucida --include='*.swift'; STRIPE_FAIL=1
else echo "  ok   no Stripe checkout, portal, or pricing-page link anywhere in the app"; fi
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
TOTALS=$(mktemp)
SERVER=""
trap '[[ -n "$SERVER" ]] && kill $SERVER 2>/dev/null' EXIT

# One fresh server, then the named tests on it. The tests find the server and the store files through TEST_RUNNER_ variables;
# DYLD_FRAMEWORK_PATH (Xcode gives its own test runs the folder of the test frameworks) is handed on to the app by the test, so the
# app's test store can start.
group() {
  local data=$(mktemp -d)/
  STEALTH_DATA=$data PORT=$PORT LUCIDA_APPLE_TEST_XCODE=1 node web/server.mjs > ${data}server.log 2>&1 &
  SERVER=$!
  for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && break; sleep 0.2; done
  TEST_RUNNER_LUCIDA_STORE=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT \
  TEST_RUNNER_LUCIDA_STOREKIT=$PWD/ios/Lucida/Lucida.storekit TEST_RUNNER_LUCIDA_STOREKIT_EMPTY=$PWD/ios/tools/empty.storekit \
  xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-store} \
    ${(@)${(s:,:)1}/#/-only-testing:LucidaUITests/} 2>&1 | tee ${data}test.log | grep -E "^  (ok|FAIL) |^Store|error:|\*\* TEST" | tee -a $TOTALS | grep -vE "^Store: |^\*\* TEST"
  kill $SERVER 2>/dev/null; wait $SERVER 2>/dev/null; SERVER=""
}
if [[ -n "$ONLY" ]]; then group "$ONLY"
else
  group "StoreTests/test1BuyMonthly,StoreTests/test3BilledOnTheWeb,StoreTests/test4NotYet,StoreTests/test5OtherGoPros"
  group "StoreTests/test2Restore"
fi
awk '/^Store: [0-9]+ passed, [0-9]+ failed/ { p += $2; f += $4 } END { printf "Store: %d passed, %d failed\n", p, f }' $TOTALS
grep -q "^\*\* TEST FAILED" $TOTALS && echo "** TEST FAILED **"
[[ -n "$STRIPE_FAIL" ]] && exit 1
exit 0
