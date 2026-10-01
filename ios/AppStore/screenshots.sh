#!/bin/zsh
# The App Store screenshots: 6.9-inch (1320 x 2868), real screens of the app with its sample data (the debug build's `-board` mode),
# no text on top. It builds the Debug app, starts a 6.9-inch simulator (an iPhone Pro Max), sets the status bar to 9:41 with full
# signal and a full battery, opens each board, and saves the screen to ios/AppStore/screenshots/.
#   ios/AppStore/screenshots.sh [simulator id]       (default: the first iPhone 17 Pro Max; DD=<folder> keeps the build elsewhere)
# The pictures are 1320 x 2868 because that is the device's own screen; the script checks it. To change a picture, change its line
# in SHOTS below (a board name, then `:dark` or `:gray` for dark mode's looks) and run it again.
HERE=${0:A:h}
cd "$HERE/.." || exit 1
OUT=$HERE/screenshots; mkdir -p $OUT
SIM=${1:-$(xcrun simctl list devices available | grep -m1 "iPhone 17 Pro Max" | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}')}
[[ -n "$SIM" ]] || { echo "No iPhone 17 Pro Max simulator: make one in Xcode (Window > Devices and Simulators)."; exit 1; }
DD=${DD:-${TMPDIR:-/tmp}/lucida-screenshots}
# name  board  [extra launch arguments after a |, split at |]
SHOTS=(
  "1-today|PhoneToday"
  "2-study|PhoneReviewFour"
  "3-learn|PhoneQuizAnswered"
  "4-deck|PhoneDeck"
  "5-stats|PhoneStatsMemory"
  "6-discover|PhoneDiscover"
  "7-shared-deck|PhonePublicDeck"
  "8-go-pro|PhoneGoPro"
)
xcodebuild -project Lucida.xcodeproj -scheme Lucida -destination "id=$SIM" -configuration Debug -derivedDataPath $DD build -quiet 2>&1 | grep -E "error:" | sort -u | head
xcrun simctl boot $SIM 2>/dev/null; xcrun simctl bootstatus $SIM -b >/dev/null 2>&1
xcrun simctl install $SIM $DD/Build/Products/Debug-iphonesimulator/Lucida.app || exit 1
# (A simulator that has just started shows a first-run notice over the top of the screen for a few seconds.)
sleep ${SETTLE:-25}
xcrun simctl ui $SIM appearance light >/dev/null 2>&1
xcrun simctl status_bar $SIM override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --operatorName "" --batteryState discharging --batteryLevel 100
for line in $SHOTS; do
  name=${line%%|*}; rest=${line#*|}; board=${rest%%|*}; extra=(); [[ "$rest" == *"|"* ]] && IFS='|' read -rA extra <<< "${rest#*|}"
  xcrun simctl terminate $SIM cards.lucida.app >/dev/null 2>&1
  xcrun simctl launch $SIM cards.lucida.app -board $board "${extra[@]}" >/dev/null
  sleep ${WAIT:-5}
  xcrun simctl io $SIM screenshot --type=png $OUT/$name.png >/dev/null 2>&1
  # (The simulator's pictures carry an alpha channel; App Store Connect wants plain RGB, so it's flattened onto white when Python has Pillow.)
  python3 -c "
from PIL import Image
p = '$OUT/$name.png'; im = Image.open(p)
if im.mode != 'RGB': bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.getchannel('A') if 'A' in im.getbands() else None); bg.save(p, optimize=True)
" 2>/dev/null
  size=$(sips -g pixelWidth -g pixelHeight $OUT/$name.png 2>/dev/null | awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w "x" h}')
  [[ "$size" == "1320x2868" ]] && echo "  ok   $name  ($board) $size" || echo "  FAIL $name  ($board) is $size, not 1320x2868"
done
xcrun simctl terminate $SIM cards.lucida.app >/dev/null 2>&1
xcrun simctl status_bar $SIM clear
