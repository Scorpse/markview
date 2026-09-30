# Build environment for MarkView's Linux packages: Ubuntu 22.04.
#
# The AppImage bundles WebKitGTK, GTK and their dependencies from the machine
# that builds it, and the binary links against that machine's glibc. Built on
# Ubuntu 24.04 it needs glibc 2.39 and will not start on 22.04 or Debian 12.
# Building on the oldest supported Ubuntu LTS, 22.04 (glibc 2.35), is the
# AppImage convention and is what AppImageHub's test runner needs. Newer
# systems run it unchanged.
#
# Use build.sh next to this file rather than running this image by hand.
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential curl wget file ca-certificates git pkg-config \
      libwebkit2gtk-4.1-dev libxdo-dev libssl-dev \
      libayatana-appindicator3-dev librsvg2-dev \
      rpm patchelf desktop-file-utils fuse3 libfuse2 xdg-utils squashfs-tools \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain stable --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"
