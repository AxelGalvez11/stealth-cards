#!/bin/zsh
# The iPhone's Pages (Data/PageData.swift, and web/pageblocks.js in JavaScriptCore through Data/GuideEngine.swift) against node, with no simulator.
#   ios/tests/pages-check.sh
# 1. The copy of web/pageblocks.js the app ships (Resources/pageblocks.js, made by design/to-ios.mjs) is the same file.
# 2. Markdown -> a Note's blocks -> Markdown in JavaScriptCore answers like node (ids aside), and an edited note keeps the ids of the blocks that didn't change.
# 3. The merge after a 409 (PageMerge) gives what web/pagesclient.js's own merge gives on the same cases.
# Needs node and swiftc. Everything it makes goes in a folder of its own (TESTDIR moves it).
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/pages
rm -rf $W; mkdir -p $W
bad=0
if cmp -s $REPO/web/pageblocks.js $REPO/ios/Lucida/Resources/pageblocks.js; then echo "the app's pageblocks.js is the same file as web/pageblocks.js: yes"
else echo "the app's pageblocks.js differs from web/pageblocks.js (run node design/to-ios.mjs)"; bad=1; fi
node $H/js/pages-dump.mjs $W || exit 1
swiftc -O -o $W/pages-check $REPO/ios/Lucida/Data/GuideEngine.swift $REPO/ios/Lucida/Data/Notes.swift $REPO/ios/Lucida/Data/PageData.swift $H/swift/pages/main.swift 2>&1 | grep -E "error" && exit 1
$W/pages-check $REPO/ios/Lucida/Resources/guide.js $REPO/ios/Lucida/Resources/pageblocks.js $W > $W/out.txt; grep -E "FAIL|^Pages" $W/out.txt; grep -q " 0 failed" $W/out.txt || bad=1
[[ $bad -eq 0 ]] && echo "pages: every check agrees" || { echo "pages: the app and node differ"; exit 1 }
