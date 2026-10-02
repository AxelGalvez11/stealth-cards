#!/bin/zsh
# The iPhone's Guide engine (web/guide.js in JavaScriptCore, Data/GuideEngine.swift) against node, with no simulator.
#   ios/tests/guide-check.sh
# 1. The copy of web/guide.js the app ships (Resources/guide.js, made by design/to-ios.mjs) is the same file as web/guide.js.
# 2. The 341 texts of the web test's table, each through parse, render, plain and headings, each through every toolbar button with three
#    selections, Enter and Tab, and every call the web's own test of the engine makes (fixtures/guide-cases.json: guide-record.mjs makes it from
#    tests/guide.mjs): node and JavaScriptCore must answer character for character the same. The 341 trees are also decoded into the Swift types the
#    app draws from and flattened like node flattens them.
# 3. The editor's memory (Data/GuideEditor.swift) against a stand-in for the server: what is typed is saved a moment after the last key, once, in order; Saving… and Saved; a failed
#    save says why and goes out with the next key; pages, History and Restore send what is waiting first.
# Needs node and swiftc. Everything it makes goes in a folder of its own (TESTDIR moves it).
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/guide
rm -rf $W; mkdir -p $W
bad=0
if cmp -s $REPO/web/guide.js $REPO/ios/Lucida/Resources/guide.js; then echo "the app's guide.js is the same file as web/guide.js: yes"
else echo "the app's guide.js differs from web/guide.js (run node design/to-ios.mjs)"; bad=1; fi
node $H/js/guide-dump.mjs $W || exit 1
swiftc -O -o $W/guide-parity $REPO/ios/Lucida/Data/GuideEngine.swift $H/swift/guide/main.swift 2>&1 | grep -E "error" && exit 1
$W/guide-parity $REPO/ios/Lucida/Resources/guide.js $W || bad=1
swiftc -O -o $W/guide-editor $REPO/ios/Lucida/Data/GuideEditor.swift $H/swift/guide-editor/main.swift 2>&1 | grep -E "error" && exit 1
$W/guide-editor | grep -E "FAIL|^Guide editor" ; $W/guide-editor | grep -q " 0 failed" || bad=1
[[ $bad -eq 0 ]] && echo "guide: every check agrees" || { echo "guide: the engine and node differ"; exit 1 }
