#!/usr/bin/env bash
# Embed AppImageUpdate information in an AppImage and write its .zsync file.
#
#     embed-update-info.sh MarkView_1.4.0_amd64.AppImage
#
# Patches the runtime's .upd_info section in place (the squashfs is not touched,
# so run this after fix-appimage-permissions.sh) and writes
# MarkView_1.4.0_amd64.AppImage.zsync next to it. Upload both to the release:
# AppImageUpdate finds the newest .zsync among the latest release's assets and
# downloads only the blocks that changed.
#
# Needs readelf (binutils) and zsyncmake (the zsync package).

set -euo pipefail

INFO='gh-releases-zsync|Scorpse|markview|latest|MarkView_*_amd64.AppImage.zsync'

APPIMAGE=$(realpath "${1:?usage: embed-update-info.sh App.AppImage}")
chmod +x "$APPIMAGE"

OFFSET=$("$APPIMAGE" --appimage-offset)
head -c "$OFFSET" "$APPIMAGE" > "$APPIMAGE.runtime.tmp"
# Section header line: [Nr] .upd_info PROGBITS addr off size ...
read -r POS SIZE < <(readelf -S -W "$APPIMAGE.runtime.tmp" | awk '/\.upd_info/ {print $(NF-6), $(NF-5)}')
rm -f "$APPIMAGE.runtime.tmp"
[ -n "${POS:-}" ] || { echo "no .upd_info section in the runtime" >&2; exit 1; }
POS=$((16#$POS)); SIZE=$((16#$SIZE))
[ "${#INFO}" -lt "$SIZE" ] || { echo "update information does not fit in $SIZE bytes" >&2; exit 1; }

# Zero-fill the section, then write the string.
head -c "$SIZE" /dev/zero | dd of="$APPIMAGE" bs=1 seek="$POS" conv=notrunc status=none
printf '%s' "$INFO" | dd of="$APPIMAGE" bs=1 seek="$POS" conv=notrunc status=none

# Read the section back from the file. Asking the runtime (--appimage-updateinformation)
# would start the application when APPIMAGE_EXTRACT_AND_RUN is set, as in the build container.
[ "$(dd if="$APPIMAGE" bs=1 skip="$POS" count="$SIZE" status=none | tr -d '\0')" = "$INFO" ] \
  || { echo "embedded update information did not read back" >&2; exit 1; }

# The URL is the bare file name: AppImageUpdate fetches it from the release
# next to the .zsync file.
( cd "$(dirname "$APPIMAGE")" && zsyncmake -u "$(basename "$APPIMAGE")" -o "$(basename "$APPIMAGE").zsync" "$(basename "$APPIMAGE")" )
echo "update information embedded; wrote $APPIMAGE.zsync"
