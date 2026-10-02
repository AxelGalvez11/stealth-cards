#!/bin/zsh
# Making cards in the iPhone app, end to end (LucidaUITests/MakeTests.swift): taps through the app as made-up people on a fresh copy of the server
# on this Mac, with the AI stood in for (the stand-in answers what OpenRouter and Gemini would, so nothing real is asked and no key is needed).
# Every source turns into cards (pasted text, a topic, pictures, a PDF, slides' words in a Word file, a recording file, a YouTube transcript and a
# YouTube link); the cards are checked (edit one, remove one, keep the rest) and saved into a deck as made from that source; Cancel while it's making
# gives the make back; the Free plan's three a day and what the 4th says; a file over the plan's size; pictures go up as small JPEGs (even a
# phone's HEIC); the recorder's timer, Pause, Resume, Stop and Discard, its stop at the plan's minutes and a new file every ten minutes; a long
# recording picked from Files (70 minutes, 33 MB) is cut into seven parts of ten minutes, which go up in order; caption files (.srt and .vtt);
# when the AI fails, Try again goes on; a deck cover's Make cards (the Library's + makes no cards) and an empty deck's; the flow opens the way the web's /make
# link does; and nothing on screen says "AI generated". It starts web/server.mjs on PORT (3934) with an empty data folder and the stand-in AI on
# STUB_PORT (3939), runs the test on a simulator, prints each check, and stops both.
#   ios/tools/e2e-make.sh [simulator id]      (DD=<folder> keeps the build somewhere else; the ports must be free; SLOW=3 waits three times as
#                                              long as usual for what the app shows, for a busy Mac (2 when not given);
#                                              ONLY=MakeTests/test03APicture,MakeTests/test09FreeLimit runs just those flows;
#                                              STUB_AI=<stub-ai.mjs> FIXTURES=<folder> point at other copies of the stand-in and the test files)
cd "${0:A:h}/../.." || exit 1
REPO=$PWD
PORT=${PORT:-3934}
STUB_PORT=${STUB_PORT:-3939}
for p in $PORT $STUB_PORT; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $p is busy: stop what's on it, or run with PORT=<another> STUB_PORT=<another>."; exit 1; fi
done
# The stand-in AI (a small server that answers like OpenRouter and Gemini; it logs every question, at /__log).
for c in "$STUB_AI" $REPO/web/tests/stub-ai.mjs $REPO/ios/tools/stub-ai.mjs /private/tmp/claude-501/-Users-axelgalvez-Desktop/6699752a-0f05-4258-bb01-dd0bf041ec39/scratchpad/full/materials/tests/stub-ai.mjs; do
  [[ -n "$c" && -f "$c" ]] && { STUB=$c; break; }
done
[[ -n "$STUB" ]] || { echo "No stand-in AI found: run with STUB_AI=<path to stub-ai.mjs>."; exit 1; }
FIX=${FIXTURES:-$REPO/ios/tests/fixtures}
DATA=$(mktemp -d)/
GEN=${DATA}gen; mkdir -p $GEN
# Files made for the run (in its own temporary folder, not in the repo): a file over Free's 20 MB, a big picture (3000 x 2000), and the same
# picture the way an iPhone's camera keeps it (HEIC).
head -c 21000000 /dev/zero | tr '\0' 'a' > $GEN/big.txt
sips -z 2000 3000 $FIX/a.jpg --out $GEN/big.png -s format png >/dev/null 2>&1
sips -s format heic $FIX/a.jpg --out $GEN/photo.heic >/dev/null 2>&1
# A recording of 70 minutes (a tone at 64 kbps, 33 MB) for the flow that cuts a long recording into parts of ten minutes: ffmpeg makes it, or
# afconvert from a silent WAV when there is no ffmpeg. (Only when that flow runs.)
if [[ -z "$ONLY" || "$ONLY" == *test17* ]]; then
  if command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=440:sample_rate=22050:duration=4200" -c:a aac -b:a 64k -ac 1 $GEN/long70.m4a
  else
    python3 -c "
import sys, wave
w = wave.open(sys.argv[1], 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
for _ in range(70): w.writeframes(b'\0' * 22050 * 2 * 60)
w.close()" $GEN/long70.wav && afconvert -f m4af -d aac@22050 -b 64000 $GEN/long70.wav $GEN/long70.m4a && rm -f $GEN/long70.wav
  fi
  [[ -s $GEN/long70.m4a ]] || echo "(No long recording was made: that flow will be skipped.)"
fi
WT=$REPO STUB_PORT=$STUB_PORT node $STUB > ${DATA}stub.log 2>&1 &
STUB_PID=$!
STEALTH_DATA=$DATA PORT=$PORT OPENROUTER_API_KEY=test OPENROUTER_BASE=http://127.0.0.1:$STUB_PORT/api/v1 GEMINI_API_KEY=test GEMINI_BASE=http://127.0.0.1:$STUB_PORT \
  node web/server.mjs > ${DATA}server.log 2>&1 &
SERVER=$!
# (The big files made for the run go when it ends; the logs stay in the run's folder.)
trap "kill $SERVER $STUB_PID 2>/dev/null; rm -f $GEN/long70.m4a $GEN/long70.wav $GEN/big.txt" EXIT
for i in {1..50}; do curl -s -o /dev/null http://127.0.0.1:$PORT/ && curl -s -o /dev/null http://127.0.0.1:$STUB_PORT/__log && break; sleep 0.2; done
DEST=${1:+id=$1}
DEST=${DEST:-"platform=iOS Simulator,name=iPhone 17e"}
# The test only runs when asked to (LUCIDA_MAKE), so the other scripts keep running their own checks alone.
ONLYARGS=(); for t in ${(s:,:)${ONLY:-MakeTests}}; do ONLYARGS+=(-only-testing:LucidaUITests/$t); done
TEST_RUNNER_LUCIDA_SLOW=${SLOW:-2} TEST_RUNNER_LUCIDA_MAKE=1 TEST_RUNNER_LUCIDA_SERVER=http://127.0.0.1:$PORT TEST_RUNNER_LUCIDA_STUB=http://127.0.0.1:$STUB_PORT \
TEST_RUNNER_LUCIDA_FIXTURES=$FIX TEST_RUNNER_LUCIDA_GEN=$GEN \
xcodebuild test -project ios/Lucida.xcodeproj -scheme LucidaUITests -destination "$DEST" -derivedDataPath ${DD:-${TMPDIR:-/tmp}/lucida-e2e-make} \
  $ONLYARGS 2>&1 | tee ${DATA}test.log | grep -E "^  (ok|FAIL) |^Make:|error:|\*\* TEST"
