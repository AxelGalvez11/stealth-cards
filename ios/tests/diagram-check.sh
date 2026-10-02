#!/bin/zsh
# The iPhone's mind map layout (Data/DiagramLayout.swift) against web/diagram.js in node, with no simulator.
#   ios/tests/diagram-check.sh
# node lays out 414 trees (the shapes that matter: a topic alone, one idea, the most ideas, a thirteenth idea that is cut, empty words, a word longer than a line, accents, Japanese, emoji,
# tabs and new lines, six levels deep, lopsided ones; and 400 random ones) and Swift lays out the same trees: every box (its place, size, level, branch and lines of words) and every link
# (its ends and the path the web draws) must be the same, and so must the count of ideas that the Diagrams tab says.
# Needs node and swiftc. Everything it makes goes in a folder of its own (TESTDIR moves it).
H=${0:A:h}; REPO=${H:h:h}; TESTDIR=${TESTDIR:-${TMPDIR:-/tmp}/lucida-ios-tests}; W=$TESTDIR/diagram
rm -rf $W; mkdir -p $W
node $H/js/diagram-dump.mjs $W || exit 1
swiftc -O -o $W/diagram-parity $REPO/ios/Lucida/Data/DiagramLayout.swift $H/swift/diagram/main.swift 2>&1 | grep -E "error" && exit 1
$W/diagram-parity $W | tee $W/out.txt
grep -q "every one the same as node" $W/out.txt && echo "diagram: the layout agrees" || { echo "diagram: the layout and node differ"; exit 1; }
