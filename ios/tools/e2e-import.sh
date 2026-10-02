#!/bin/zsh
# Import cards on the iPhone, end to end (LucidaUITests/ImportTests.swift): every way in (the Library's +, a brand-new account's Import cards, and
# a deck's chip, an empty deck's too), pasting and typing (the count, and the line when there are no cards), into a new deck and one of
# yours, files read as if chosen in the Files picker (UTF-16, Latin-1, an Anki export, 2,500 cards, a file that isn't text) and the picker itself,
# and the quiet line when a save fails (ios/tools/fail-proxy.mjs in front of the server fails every save while a file exists) or the server says no.
# No system alert ever shows. It starts web/server.mjs on PORT (3971) with an empty data folder and the stand-in on PROXYPORT (3972), makes the files,
# runs the test on a simulator, prints each check, and stops both.
#   ios/tools/e2e-import.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free;
#                                                ONLY=ImportTests/test5Files runs just that flow; TEST_RUNNER_SHOTS=<folder> keeps pictures)
cd "${0:A:h}/../.." || exit 1
REPO=$PWD
PORT=${PORT:-3971}
PROXYPORT=${PROXYPORT:-3972}
for p in $PORT $PROXYPORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> PROXYPORT=<another>."; exit 1; fi
done
DATA=$(mktemp -d)/
FILES=${DATA}files
mkdir -p $FILES
# The files: words in UTF-16 with its mark, Latin-1, an Anki export (its headers, HTML, a blank), 2,500 cards, and a picture named .txt.
node -e "
const fs = require('fs'), d = process.argv[1];
fs.writeFileSync(d + '/utf16.tsv', Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('café\tcoffee\r\nnaïve\tinnocent\r\n日本\tJapan\r\n', 'utf16le')]));
fs.writeFileSync(d + '/latin1.csv', Buffer.from('été,summer\nhiver,winter\n', 'latin1'));
fs.writeFileSync(d + '/anki.txt', '#separator:tab\n#html:true\n#deck column:1\nBio::Cells\t<b>Mitochondria</b>\tthe powerhouse\nBio::Cells\tThe {{c1::nucleus}} holds the DNA\t\n');
fs.writeFileSync(d + '/big.tsv', Array.from({ length: 2500 }, (_, i) => 'front ' + (i + 1) + '\tback ' + (i + 1)).join('\n'));
fs.writeFileSync(d + '/cells.txt', '#separator:tab\n#html:false\n' + [['What organelle makes most of the cell’s ATP?', 'The mitochondria'], ['What do ribosomes do?', 'They build proteins'],
  ['Which organelle packages and ships proteins?', 'The Golgi apparatus'], ['What surrounds and protects a cell?', 'The plasma membrane'], ['What do lysosomes do?', 'Break down waste'],
  ['Where does photosynthesis happen?', 'In the chloroplasts'], ['What does rough ER have that smooth ER lacks?', 'Ribosomes'], ['Where is DNA kept?', 'In the nucleus'],
  ['What is the cytoplasm?', 'The gel that fills the cell'], ['What do mitochondria have of their own?', 'Their own DNA'], ['What is the cytoskeleton?', 'A network of protein fibers'],
  ['What do vacuoles store?', 'Water, food and waste']].map(c => c.join('\t')).join('\n'));
fs.writeFileSync(d + '/picture.txt', Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a2b4ca1c0000000049454e44ae426082', 'hex'));
" $FILES || exit 1
STEALTH_DATA=$DATA PORT=$PORT node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
TARGET=http://127.0.0.1:$PORT PORT=$PROXYPORT FAIL_FLAG=${DATA}fail node ios/tools/fail-proxy.mjs > ${DATA}proxy.log 2>&1 &
PROXY=$!
trap "kill $SERVER $PROXY 2>/dev/null" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$PROXYPORT/ && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_IMPORT), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-ImportTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_IMPORT=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_PROXY=http://127.0.0.1:$PROXYPORT TEST_RUNNER_LUCIDA_FAIL_FLAG=${DATA}fail \
TEST_RUNNER_LUCIDA_IMPORT_FILES=$FILES \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-import} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Import:|error:|\*\* TEST"
