# Game Showcase

A Progressive Web App launcher for nine browser games. Installs to a phone home screen and
plays offline after the first load.

**Live: https://thebalticone.github.io/arcade/**

## Add to an iPhone home screen

Open the link **in Safari** — Add to Home Screen doesn't exist in Chrome or in-app browsers.
Then Share → Add to Home Screen. It appears as "Arcade" and launches without the address bar.

## Games

Pong · UFO Dash · Chopper · Snake · Pac-Man · Racer · Solitaire · Wolf · Tilt

Each lives in its own folder as `index.html` with a ⊞ button back to the launcher.
`phagocyte.html` is also here but isn't on the launcher grid — reach it directly at
`/arcade/phagocyte.html`.

## Structure

```
index.html            Launcher grid
manifest.json         PWA metadata (all paths relative — see below)
service-worker.js     Offline cache
apple-touch-icon.png  iOS home screen icon (180px)
icon-*.png            Manifest icons (192, 512, 512 maskable)
tools/make-icons.mjs  Regenerates the icons above
<game>/index.html     One folder per game
```

## Changing a game

Drop the new HTML in as `<game>/index.html`, then **bump `CACHE_NAME` in `service-worker.js`**
(`game-showcase-v2` → `v3`). The service worker is cache-first, so without a bump, phones that
already installed the app keep serving the old copy indefinitely.

## Paths are relative on purpose

GitHub Pages serves this from `/arcade/`, not the domain root. `manifest.json` uses
`"start_url": "./"` and `"scope": "./"`, and the service worker caches `./` rather than `/`.
Absolute paths break both the install prompt and offline mode here.

## Icons

iOS ignores SVG and `data:` URIs for `apple-touch-icon`, so real PNGs are required or the home
screen shows a screenshot of the page instead. To regenerate:

```bash
cp tools/make-icons.mjs /mnt/c/Users/bigge/icon-build/ && cd /mnt/c/Users/bigge/icon-build
"/mnt/c/Program Files/nodejs/node.exe" make-icons.mjs   # then copy the PNGs back
```

Windows Node resolves relative paths against a Windows working directory, which is why the script
is run from a `/mnt/c` path rather than in place. (No Python or ImageMagick in this WSL.)

## Local testing

```bash
npx http-server        # or any static server
```

A service worker needs `localhost` or HTTPS; opening `index.html` as a `file://` URL won't
register it.

## Not in the repo

`files/`, `full-context-files/`, `showcase-files/`, the `.zip`/`.tar.gz` archives and `_local/`
are gitignored — they're build material and older drafts, kept on disk but not published.
