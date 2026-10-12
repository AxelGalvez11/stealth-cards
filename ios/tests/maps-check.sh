#!/bin/zsh
# The iPhone's Mind map engine (web/maps.js in JavaScriptCore, through Data/MapEngine.swift) against node, with no simulator.
#   ios/tests/maps-check.sh [maps]        (500 seeded maps unless told otherwise)
# 1. The copy of web/maps.js the app ships (Resources/maps.js, made by design/to-ios.mjs) is the same file.
# 2. Every call ios/tests/js/maps-dump.mjs makes in node (normalize, the outline text both ways, layoutMind, previewOf, merge, edit, diff and
#    summaryOf, the study helpers; seeded maps plus the edge cases: empty, the caps, depth, CJK and emoji, refusals) answers the same bytes in
#    JavaScriptCore, and the app's readers of those answers (MapLayout, MapPreview, MapTree, MapText.units) read them.
# Needs node and swiftc. Everything it makes goes in a folder of its own (TESTDIR moves it).
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/maps
rm -rf $W; mkdir -p $W
bad=0
if cmp -s $REPO/web/maps.js $REPO/ios/Lucida/Resources/maps.js; then echo "the app's maps.js is the same file as web/maps.js: yes"
else echo "the app's maps.js differs from web/maps.js (run node design/to-ios.mjs)"; bad=1; fi
node $H/js/maps-dump.mjs $W ${1:-500} || exit 1
swiftc -O -o $W/maps-check $REPO/ios/Lucida/Data/MapEngine.swift $REPO/ios/Lucida/Data/MapData.swift $H/swift/maps/main.swift 2>&1 | grep -E "error" && exit 1
$W/maps-check $REPO/ios/Lucida/Resources/maps.js $W > $W/out.txt; grep -E "FAIL|^Maps|answered|^[a-z]+ [0-9]" $W/out.txt; grep -q " 0 failed" $W/out.txt || bad=1
[[ $bad -eq 0 ]] && echo "maps: node and JavaScriptCore agree byte for byte" || { echo "maps: the app and node differ"; exit 1 }
