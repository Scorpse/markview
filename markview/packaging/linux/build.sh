#!/usr/bin/env bash
# Build MarkView's Linux packages (.deb, .rpm, .AppImage) on Ubuntu 22.04.
#
# Usage, from the repository root:
#
#     bash markview/packaging/linux/build.sh [output-dir]      # default: ./linux-dist
#
# It builds the image from the Dockerfile next to this script, copies the source
# into the container without node_modules or build output (so nothing from the
# host leaks in), builds, then runs fix-appimage-permissions.sh on the AppImage.
# Needs Docker. The source tree is mounted read-only.
#
# Inside the container this same file is run with --in-container.

set -euo pipefail

if [ "${1:-}" != "--in-container" ]; then
  HERE=$(cd "$(dirname "$0")" && pwd)
  ROOT=$(cd "$HERE/../../.." && pwd)
  OUT=$(mkdir -p "${1:-$ROOT/linux-dist}" && cd "${1:-$ROOT/linux-dist}" && pwd)
  docker build -f "$HERE/Dockerfile" -t markview-build:ubuntu2204 "$HERE"
  exec docker run --rm \
    -v "$ROOT:/src:ro" -v "$OUT:/out" \
    markview-build:ubuntu2204 bash /src/markview/packaging/linux/build.sh --in-container
fi

export PATH="/root/.cargo/bin:$PATH"
echo "build host: $(. /etc/os-release; echo "$PRETTY_NAME"), $(ldd --version | head -1)"

rm -rf /build && mkdir -p /build
tar -C /src/markview \
    --exclude=./node_modules --exclude=./src-tauri/target --exclude=./dist \
    -cf - . | tar -C /build -xf -
cd /build

npm ci --no-audit --no-fund
VERSION=$(node -p "require('./package.json').version")
echo "building MarkView $VERSION with @tauri-apps/cli $(node -p "require('@tauri-apps/cli/package.json').version")"

# No FUSE in a container, and linuxdeploy's bundled strip cannot read the newer
# .relr.dyn sections that some libraries carry.
export APPIMAGE_EXTRACT_AND_RUN=1 NO_STRIP=1
npm run tauri build -- --bundles appimage,deb,rpm

APPIMAGE=$(ls src-tauri/target/release/bundle/appimage/*.AppImage)
# Tauri writes AppRun.wrapped as 0770, which another user cannot run.
bash packaging/fix-appimage-permissions.sh "$APPIMAGE"

mkdir -p /out
cp "$APPIMAGE" "/out/MarkView_${VERSION}_amd64.AppImage"
cp src-tauri/target/release/bundle/deb/*.deb /out/
cp src-tauri/target/release/bundle/rpm/*.rpm /out/
ls -la /out
