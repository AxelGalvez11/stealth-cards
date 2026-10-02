#!/bin/zsh
# The iPhone's Guide engine (web/guide.js in JavaScriptCore, Data/GuideEngine.swift) against node, with no simulator.
#   ios/tests/guide-check.sh
# 1. The copy of web/guide.js the app ships (Resources/guide.js, made by design/to-ios.mjs) is the same file as web/guide.js.
# 2. The 341 texts of the web test's table, each through parse, render, plain and headings, each through every toolbar button with three
#    selections, Enter and Tab, and every call the web's own test of the engine makes (fixtures/guide-cases.json: guide-record.mjs makes it from
#    tests/guide.mjs): node and JavaScriptCore must answer character for character the same. The 341 trees are also decoded into the Swift types the
#    app draws from and flattened like node flattens them.
# 3. The editor's memory (Data/GuideEditor.swift) against a stand-in for the server: what is typed is saved a moment after the last key, once, in order; Saving… and Saved; a failed
#    save says why and goes out with the next key; pages, History and Restore send what is waiting first; a page that is too long says so.
# 4. The Notes page's rules (Data/Notes.swift NotesPage, swift/notes): a blank note, the shortcuts, Enter, Backspace, Tab, Aa, the marks, links, pasting, toggles and folded
#    sections and what is remembered, and that what is saved is the Markdown the web writes; and its own icons are web/notes.js's.
# Needs node and swiftc. Everything it makes goes in a folder of its own (TESTDIR moves it).
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/guide
rm -rf $W; mkdir -p $W
bad=0
if cmp -s $REPO/web/guide.js $REPO/ios/Lucida/Resources/guide.js; then echo "the app's guide.js is the same file as web/guide.js: yes"
else echo "the app's guide.js differs from web/guide.js (run node design/to-ios.mjs)"; bad=1; fi
node $H/js/guide-dump.mjs $W || exit 1
swiftc -O -o $W/guide-parity $REPO/ios/Lucida/Data/GuideEngine.swift $REPO/ios/Lucida/Data/Notes.swift $H/swift/guide/main.swift 2>&1 | grep -E "error" && exit 1
$W/guide-parity $REPO/ios/Lucida/Resources/guide.js $W || bad=1
swiftc -O -o $W/guide-editor $REPO/ios/Lucida/Data/GuideEditor.swift $H/swift/guide-editor/main.swift 2>&1 | grep -E "error" && exit 1
$W/guide-editor | grep -E "FAIL|^Guide editor" ; $W/guide-editor | grep -q " 0 failed" || bad=1
# 4. The Notes page's rules (Data/Notes.swift), with guide.js beside it where the app's bundle would have it.
swiftc -O -o $W/notes-rules $REPO/ios/Lucida/Data/GuideEngine.swift $REPO/ios/Lucida/Data/Notes.swift $H/swift/notes/main.swift 2>&1 | grep -E "error" && exit 1
cp $REPO/ios/Lucida/Resources/guide.js $W/guide.js
(cd $W && ./notes-rules > notes-rules.txt); grep -E "FAIL|^Notes rules" $W/notes-rules.txt; grep -q " 0 failed" $W/notes-rules.txt || bad=1
node $H/js/notes-icons.mjs $REPO || bad=1
[[ $bad -eq 0 ]] && echo "guide: every check agrees" || { echo "guide: the engine and node differ"; exit 1 }
