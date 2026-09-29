#!/usr/bin/env bash
# Make an AppImage's contents accessible to users other than the one who built it.
#
# Tauri's AppImage bundler writes AppRun.wrapped with mode 0770. The image
# records owner and mode, so wherever it is mounted by the kernel, for example
# under firejail as AppImageHub's test does, any user other than the builder gets
#
#     AppRun: line 12: .../AppRun.wrapped: Permission denied
#
# and the application exits at once. A FUSE mount by the user does not enforce
# those bits, which is why the problem goes unnoticed on a developer machine.
#
# This unpacks the image, opens the modes to go+rX, repacks it, and puts the
# original runtime back in front. Nothing else in the image changes.
#
# Usage: fix-appimage-permissions.sh App.AppImage [Fixed.AppImage]
#   With one argument the file is replaced in place.
#
# Needs: squashfs-tools (unsquashfs, mksquashfs). No FUSE, no display.

set -euo pipefail

SRC=${1:?usage: fix-appimage-permissions.sh App.AppImage [Fixed.AppImage]}
OUT=${2:-$SRC}

for tool in unsquashfs mksquashfs; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool not found; install squashfs-tools" >&2; exit 1; }
done
[ -f "$SRC" ] || { echo "not a file: $SRC" >&2; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# --appimage-offset is answered by the runtime itself, so no FUSE is needed. It
# has to be executable to be asked, so ask a private copy.
cp "$SRC" "$WORK/in.AppImage"
chmod +x "$WORK/in.AppImage"
OFFSET=$("$WORK/in.AppImage" --appimage-offset)
[[ "$OFFSET" =~ ^[0-9]+$ ]] || { echo "could not read the runtime offset from $SRC" >&2; exit 1; }

# Repack with the compression and block size the image already uses.
INFO=$(unsquashfs -o "$OFFSET" -s "$WORK/in.AppImage")
COMP=$(sed -n 's/^Compression //p' <<<"$INFO" | head -n 1)
BLOCK=$(sed -n 's/^Block size //p' <<<"$INFO" | head -n 1)
: "${COMP:=zstd}" "${BLOCK:=131072}"

head -c "$OFFSET" "$WORK/in.AppImage" > "$WORK/runtime"
unsquashfs -o "$OFFSET" -d "$WORK/root" -no-xattrs "$WORK/in.AppImage" >/dev/null

chmod -R u+rwX,go+rX "$WORK/root"

# -root-owned records everything as root:root, as the bundler's own image does.
mksquashfs "$WORK/root" "$WORK/fs.squashfs" -root-owned -noappend -no-xattrs \
  -comp "$COMP" -b "$BLOCK" -quiet >/dev/null

cat "$WORK/runtime" "$WORK/fs.squashfs" > "$WORK/out.AppImage"
chmod 755 "$WORK/out.AppImage"
mv "$WORK/out.AppImage" "$OUT"
echo "fixed: $OUT"
