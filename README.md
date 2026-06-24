# GitHub Desktop Theme for VS Code

A VS Code theme that visually matches the **GitHub Desktop** window. The colors
are not hand-picked — they are extracted directly from the installed GitHub
Desktop application, so they match one-to-one and update along with the app.

> Unofficial project, not affiliated with GitHub. Based on GitHub Desktop's
> colors and the official GitHub VS Code theme (MIT, see `vendor/`).

## How it works

```
Desktop color source ─────────────────┐
  app:  the app's renderer.css         │  scripts/generate.mjs
  repo: SCSS from desktop/desktop (sass)├─►  parse → resolve var() → hex
   (:root = light, theme-dark = dark)  │     ↓
                                       │   mapping (scripts/mapping.mjs)
github.github-vscode-theme (vendor/)  ─┘     ↓
  (bottom filler layer)                themes/github-desktop-{light,dark}.json
```

Priorities:

1. **Everything comes from GitHub Desktop** — both the UI colors and the syntax
   highlighting (`--syntax-*`).
2. The official GitHub theme is only used as a bottom layer for the VS Code
   tokens that have no direct counterpart in the Desktop palette.
3. Desktop's dark toolbar (`#24292e`) is carried over into `titleBar` /
   `activityBar` / `statusBar` (light gray in the light theme so it isn't
   overpowering).

### Two color sources

Both produce an **identical** result (verified: 0 differences):

- **`app`** (default) — the built `renderer.css` of the installed application,
  where the SCSS is already compiled into ready hex values. Convenient locally.
- **`repo`** (`SOURCE=repo`) — compiles SCSS directly from a `desktop/desktop`
  clone via `sass` + `primer-support`. Does not require the installed app and is
  used in CI.

## Installation

The extension is installed via a local symlink:

```bash
ln -s "$PWD" ~/.vscode/extensions/github-desktop-theme
```

Then in VS Code: **Developer: Reload Window**, followed by
**Preferences: Color Theme** → `GitHub Desktop Light` / `GitHub Desktop Dark`.

## Regenerating

From the installed application (locally):

```bash
npm run generate            # SOURCE=app
```

From the desktop/desktop repository sources:

```bash
git clone --depth 1 --branch development https://github.com/desktop/desktop.git _desktop
DESKTOP_REPO=$PWD/_desktop npm run generate:repo   # SOURCE=repo
```

Build an installable `.vsix` locally:

```bash
npm run package
```

Environment variables:

- `SOURCE` — `app` (default) or `repo`.
- `GITHUB_DESKTOP_CSS` — path to the app's `renderer.css` (for `app`).
- `DESKTOP_REPO` — path to a `desktop/desktop` clone (for `repo`).
- `GITHUB_VSCODE_THEME_DIR` — base theme directory (if there is no vendored snapshot).

## Automated builds (CI)

`.github/workflows/sync-theme.yml` clones `desktop/desktop`, compiles the themes
(`SOURCE=repo`) and commits changes to `themes/` if the colors changed. It also
builds a `.vsix` and publishes a GitHub Release. Triggers:

- on a schedule (cron — the 1st and 15th of each month);
- manually via **Run workflow** (you can pass a desktop branch/tag);
- on changes to `scripts/` or `vendor/`.

## Layout

| File | Purpose |
|------|---------|
| `scripts/generate.mjs`       | CSS parser, `var()` resolver, color converter, assembly |
| `scripts/desktop-source.mjs` | color source: `app` (renderer.css) or `repo` (SCSS compile) |
| `scripts/mapping.mjs`        | mapping of Desktop variables ↔ VS Code tokens |
| `vendor/github-vscode-theme/`| snapshot of the official theme (bottom filler layer, MIT) |
| `themes/*.json`              | generated themes (committed) |
| `.github/workflows/`         | auto-generation when desktop/desktop updates |
| `package.json`               | VS Code extension manifest |

## License

MIT — see `LICENSE`. The bundled base theme in `vendor/github-vscode-theme/` is
from [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme)
(MIT).
