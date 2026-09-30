# Packaging MarkView for Linux stores

Three artifacts:

| Format | Where | Built by |
|--------|-------|----------|
| `.deb` + `.AppImage` | GitHub Releases, direct download | `npm run tauri build` (local) |
| Snap | Snap Store (`snapcraft.io/markview-reader`) | `snapcraft` reads `snap/snapcraft.yaml` |
| Flatpak | Flathub (`flathub/io.github.Scorpse.MarkView`) | `flatpak-builder` reads `flatpak/io.github.Scorpse.MarkView.yml` |

All three use the same AppStream metadata in
`packaging/io.github.Scorpse.MarkView.metainfo.xml`.

---

## Tagging a release

Everything downstream expects a git tag. Before any of the below:

```bash
# Bump version in package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml,
# src/components/AboutModal.tsx, and packaging/*.metainfo.xml <releases>.
git commit -am "Release X.Y.Z"
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main vX.Y.Z
```

---

## Building the Linux packages

Build the `.deb`, `.rpm` and `.AppImage` with:

```bash
bash markview/packaging/linux/build.sh          # from the repository root; output in ./linux-dist
```

It needs Docker. It builds an Ubuntu 22.04 image (`packaging/linux/Dockerfile`),
copies the source in without `node_modules` or build output, runs
`npm run tauri build`, and then runs `fix-appimage-permissions.sh` on the
AppImage. Do not build the release packages on a newer Ubuntu; both of the
following have already cost a failed AppImageHub test.

**Build on the oldest supported Ubuntu LTS (22.04).** The AppImage bundles
WebKitGTK, GTK and their dependencies from the build machine, and the binary
links against that machine's glibc. Built on Ubuntu 24.04 it needed glibc 2.39
and stopped at start-up on 22.04 with

```
markview: .../libc.so.6: version `GLIBC_2.39' not found (required by markview)
```

Built on 22.04 the newest glibc anything in the image needs is 2.35, and newer
systems run it unchanged. The same applies to the `.deb` and `.rpm`, which link
the binary against the build machine's glibc too.

**Open the file modes (`fix-appimage-permissions.sh`).** Tauri's AppImage
bundler writes `AppRun.wrapped` with mode `0770`, and the image records owner
and mode. A FUSE mount by the user does not enforce them, so it works on a
developer machine, but a kernel mount, which is what AppImageHub's
`firejail --appimage` test uses, refuses another user:

```
AppRun: line 12: .../AppRun.wrapped: Permission denied
```

and the application exits within seconds. The script opens the modes, repacks
the image with its original runtime and compression, and changes nothing else.
It replaces the file in place, or writes a second path if one is given. It needs
`squashfs-tools` and no display.

**Let users update it (`embed-update-info.sh`).** An AppImage can carry update
information that AppImageUpdate and similar tools read to fetch only the blocks
that changed. The script writes `gh-releases-zsync|Scorpse|markview|latest|MarkView_*_amd64.AppImage.zsync`
into the runtime's `.upd_info` section, which leaves the squashfs untouched, and
runs `zsyncmake` to produce `MarkView_<version>_amd64.AppImage.zsync`. Run it
after the permission fix and on the file under its final name, since the
`.zsync` records that name. **Upload the `.zsync` next to the AppImage in the
release**: the update information looks for it there in the latest release, so
an AppImage with no `.zsync` published beside it cannot be updated. It needs
`binutils` (`readelf`) and `zsync`.

---

## Snap Store

### One-time setup
1. Register an Ubuntu One account at <https://snapcraft.io/account>.
2. Install snapcraft: `sudo snap install snapcraft --classic`.
3. Log in: `snapcraft login`.
4. Reserve the name: `snapcraft register markview-reader --yes` (must be
   done once, by the publisher; `markview` alone was already taken).

### Each release
```bash
cd markview
snapcraft pack                     # builds .snap in repo root
snapcraft upload *.snap --release=stable
```

Snap Store auto-publishes to `stable` after upload; no human review for
subsequent versions unless the declared `plugs` change substantially.

---

## Flathub

Flathub requires submitting through a pull request to
<https://github.com/flathub/flathub>. Review usually takes 1–2 weeks for
new apps.

### Prerequisites (one-time)
1. Generate offline-build lockfile sources:
   ```bash
   # Install helpers
   pip install flatpak-node-generator
   curl -O https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/cargo/flatpak-cargo-generator.py

   # Generate
   python flatpak-cargo-generator.py src-tauri/Cargo.lock -o flatpak/cargo-sources.json
   flatpak-node-generator npm package-lock.json -o flatpak/node-sources.json
   ```
2. Uncomment the `cargo-sources.json` / `node-sources.json` includes in
   `flatpak/io.github.Scorpse.MarkView.yml`.
3. Pin the git source to an exact commit SHA (Flathub reviewer will ask).

### Local test
```bash
flatpak install --user -y flathub org.gnome.Platform//47 org.gnome.Sdk//47 \
    org.freedesktop.Sdk.Extension.rust-stable//24.08 \
    org.freedesktop.Sdk.Extension.node22//24.08

flatpak-builder --user --install --force-clean build-dir \
    flatpak/io.github.Scorpse.MarkView.yml

flatpak run io.github.Scorpse.MarkView
```

### Submit
1. Fork <https://github.com/flathub/flathub>, create branch
   `new-pr/io.github.Scorpse.MarkView`.
2. Add: `io.github.Scorpse.MarkView.yml`,
   `cargo-sources.json`, `node-sources.json`, `io.github.Scorpse.MarkView.metainfo.xml`.
3. Open PR. A reviewer will comment; iterate until merged.
4. Once merged, a dedicated `flathub/io.github.Scorpse.MarkView` repo
   is created — future updates PR into *that* repo, not flathub/flathub.

---

## App ID mapping

- **Tauri identifier** (`tauri.conf.json`): `com.markview.app` — kept for
  backward compatibility with the Microsoft Store binary.
- **Linux distribution ID** (Snap / Flathub / metainfo XML):
  `io.github.Scorpse.MarkView` — Flathub policy requires reverse-DNS
  under a domain the publisher owns; we don't own `markview.app`, so we
  use the `io.github.<org>.<repo>` convention Flathub accepts for
  GitHub-hosted projects.
- Packaging scripts rename the .desktop file and AppStream XML to the
  Linux ID during build so end-users see a single consistent identifier.
