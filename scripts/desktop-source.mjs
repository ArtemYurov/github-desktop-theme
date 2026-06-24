// Obtains the CSS containing GitHub Desktop variables from one of two sources:
//   - 'app'  — the built renderer.css of the installed app (values ready);
//   - 'repo' — compiling SCSS from a desktop/desktop clone (for CI).
// Both paths yield identical final colors.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Source 'app': renderer.css of the installed application ---------------

export function findAppCss() {
  if (process.env.GITHUB_DESKTOP_CSS) return process.env.GITHUB_DESKTOP_CSS;
  const candidates = [
    '/Applications/GitHub Desktop.app/Contents/Resources/app/renderer.css',
    path.join(os.homedir(), 'Applications/GitHub Desktop.app/Contents/Resources/app/renderer.css'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(
    'GitHub Desktop renderer.css not found. Install the app, set GITHUB_DESKTOP_CSS, ' +
      'or use the repo source (SOURCE=repo).'
  );
}

// --- Source 'repo': compile SCSS from a desktop/desktop clone --------------

/** Path to the desktop/desktop clone (env DESKTOP_REPO). */
function findRepoDir() {
  const dir = process.env.DESKTOP_REPO;
  if (!dir) {
    throw new Error('For SOURCE=repo set DESKTOP_REPO to a desktop/desktop clone path.');
  }
  if (!fs.existsSync(path.join(dir, 'app/styles/_variables.scss'))) {
    throw new Error(`${dir} has no app/styles/_variables.scss — not a desktop/desktop clone.`);
  }
  return dir;
}

/**
 * Compiles Desktop SCSS into CSS with the :root and body.theme-dark variables.
 * It imports only the palette + variables + dark theme — the minimum needed to
 * extract colors. The webpack '~' prefix is resolved from the project's
 * node_modules.
 */
async function compileRepoScss() {
  const sass = await import('sass');
  const repo = findRepoDir();
  const stylesDir = path.join(repo, 'app/styles');
  const nodeModules = path.join(ROOT, 'node_modules');

  const entry = "@import 'variables';\n@import 'themes/dark';\n";
  const result = sass.compileString(entry, {
    loadPaths: [stylesDir, nodeModules],
    importers: [
      {
        // "~pkg/..." (webpack syntax) → a file in the project's node_modules.
        findFileUrl(url) {
          if (url.startsWith('~')) return pathToFileURL(path.join(nodeModules, url.slice(1)));
          return null;
        },
      },
    ],
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api'],
  });
  return result.css;
}

/**
 * Returns CSS text with Desktop variables for the chosen source.
 * @param {'app'|'repo'} source
 * @returns {Promise<{css: string, label: string}>}
 */
export async function getDesktopCss(source) {
  if (source === 'repo') {
    return { css: await compileRepoScss(), label: `repo: ${process.env.DESKTOP_REPO}` };
  }
  const cssPath = findAppCss();
  return { css: fs.readFileSync(cssPath, 'utf8'), label: `app: ${cssPath}` };
}
