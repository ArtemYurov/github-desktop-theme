#!/usr/bin/env node
// Generates a VS Code theme that matches the GitHub Desktop window.
//
// Source of truth is the built renderer.css of the installed GitHub Desktop app:
// it already holds the final computed values of every CSS variable for the light
// (:root) and dark (.theme-dark) themes. We extract them, recursively resolve
// var() references, convert to hex and distribute across VS Code theme tokens
// according to the mapping.
//
// The official GitHub theme (github.github-vscode-theme) is used ONLY as a
// bottom filler layer: it covers the VS Code tokens that have no direct
// counterpart in the Desktop palette. Everything Desktop defines explicitly
// (UI and syntax) overrides the official values.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mapColors, mapTokenColors } from './mapping.mjs';
import { getDesktopCss } from './desktop-source.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'themes');

// Desktop color source: 'app' (the app's renderer.css) or 'repo' (compile SCSS
// from a desktop/desktop clone). Defaults to app; CI uses repo.
const SOURCE = process.env.SOURCE === 'repo' ? 'repo' : 'app';

// ---------------------------------------------------------------------------
// 1. Locate the official filler theme
// ---------------------------------------------------------------------------

const collator = new Intl.Collator(undefined, { numeric: true });

/**
 * Directory with the official github.github-vscode-theme themes (bottom filler
 * layer). Lookup order: vendored snapshot in the repo (deterministic, for CI) →
 * env → installed VS Code/Cursor extension (for local development).
 */
function findOfficialThemesDir() {
  const vendor = path.join(ROOT, 'vendor/github-vscode-theme');
  if (fs.existsSync(path.join(vendor, 'light-default.json'))) return vendor;
  if (process.env.GITHUB_VSCODE_THEME_DIR) return process.env.GITHUB_VSCODE_THEME_DIR;

  const extRoots = [
    path.join(os.homedir(), '.vscode/extensions'),
    path.join(os.homedir(), '.cursor/extensions'),
    path.join(os.homedir(), '.vscode-server/extensions'),
  ];
  const found = [];
  for (const root of extRoots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      if (name.startsWith('github.github-vscode-theme-')) {
        found.push({ name, dir: path.join(root, name, 'themes') });
      }
    }
  }
  if (!found.length) {
    throw new Error(
      'Could not find the github.github-vscode-theme base (no vendored snapshot, env, or extension).'
    );
  }
  found.sort((a, b) => collator.compare(a.name, b.name));
  return found[found.length - 1].dir;
}

// ---------------------------------------------------------------------------
// 2. Parse Desktop CSS variables
// ---------------------------------------------------------------------------

/**
 * Collects --variable declarations from every block whose selector contains
 * `selectorNeedle`. Variable values contain no curly braces, so a block is
 * reliably matched with `selector{ ... no { } ... }`.
 */
function collectVars(css, selectorNeedle) {
  const vars = {};
  // Any selector containing the needle (e.g. ":root, ::backdrop" or ".theme-dark")
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1];
    if (!selector.includes(selectorNeedle)) continue;
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':');
      if (i === -1) continue;
      const key = decl.slice(0, i).trim();
      if (!key.startsWith('--')) continue;
      vars[key] = decl.slice(i + 1).trim();
    }
  }
  return vars;
}

/** Parses Desktop CSS → { light: {var: raw}, dark: {var: raw} }. */
function parseDesktopVars(css) {
  // dart-sass (the repo source) keeps CSS comments /* ... */ in its output, while
  // the minified renderer.css (the app source) does not. A comment in front of a
  // variable declaration breaks parsing, so we strip them in both cases.
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const light = collectVars(css, ':root');
  const darkOverrides = collectVars(css, '.theme-dark');
  // In the real DOM, body.theme-dark inherits :root variables and overrides some.
  const dark = { ...light, ...darkOverrides };
  return { light, dark };
}

// ---------------------------------------------------------------------------
// 3. Resolve var() and convert to hex
// ---------------------------------------------------------------------------

/** Splits var(...) arguments at the top nesting level by comma. */
function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

/**
 * Recursively substitutes var(--name, fallback) values from scope.
 * Returns a string without var() (or with unresolved var() if the variable is
 * missing and there is no fallback).
 */
function resolveVars(value, scope, seen = new Set()) {
  let out = value;
  let guard = 0;
  while (out.includes('var(') && guard++ < 50) {
    const start = out.indexOf('var(');
    // Find the matching closing paren for this var(
    let depth = 0;
    let end = -1;
    for (let i = start + 3; i < out.length; i++) {
      if (out[i] === '(') depth++;
      else if (out[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    const inner = out.slice(start + 4, end); // contents inside var(...)
    const [name, ...fb] = splitTopLevel(inner);
    let replacement;
    if (scope[name] !== undefined && !seen.has(name)) {
      replacement = resolveVars(scope[name], scope, new Set(seen).add(name));
    } else if (fb.length) {
      replacement = resolveVars(fb.join(', '), scope, seen);
    } else {
      replacement = ''; // no value — drop it, the token is discarded later
    }
    out = out.slice(0, start) + replacement + out.slice(end + 1);
  }
  return out.trim();
}

const NAMED = { white: '#ffffff', black: '#000000', transparent: '#00000000' };

function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function to2(n) {
  return clamp255(n).toString(16).padStart(2, '0');
}

/**
 * Converts a CSS color value to hex (#rrggbb or #rrggbbaa).
 * Returns null if the value is not a plain color (gradient, none, etc.).
 */
function colorToHex(value) {
  if (!value) return null;
  let v = value.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];

  if (v.startsWith('#')) {
    const h = v.slice(1);
    if (/^[0-9a-f]{3}$/.test(h)) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    if (/^[0-9a-f]{4}$/.test(h))
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    if (/^[0-9a-f]{6}$/.test(h)) return `#${h}`;
    if (/^[0-9a-f]{8}$/.test(h)) return `#${h}`;
    return null;
  }

  const rgb = v.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = splitTopLevel(rgb[1].replace(/\//g, ',')); // also supports rgb(r g b / a)
    const nums = parts.flatMap((p) => p.split(/\s+/)).filter(Boolean);
    if (nums.length < 3) return null;
    const r = to2(parseFloat(nums[0]));
    const g = to2(parseFloat(nums[1]));
    const b = to2(parseFloat(nums[2]));
    let a = '';
    if (nums[3] !== undefined) {
      const av = parseFloat(nums[3]);
      const alpha = nums[3].includes('%') ? av / 100 : av;
      if (alpha < 1) a = to2(alpha * 255);
    }
    return `#${r}${g}${b}${a}`;
  }
  return null; // hsl/gradients/other are unsupported — let the fallback apply
}

// ---------------------------------------------------------------------------
// 4. Build the theme
// ---------------------------------------------------------------------------

function buildVariant({ variantKey, name, type, desktopVars, officialPath, colorOpts }) {
  const official = JSON.parse(fs.readFileSync(officialPath, 'utf8'));

  // getter: Desktop variable name → ready hex (or null).
  const cache = new Map();
  const get = (varName) => {
    if (cache.has(varName)) return cache.get(varName);
    const raw = desktopVars[varName];
    const hex = raw === undefined ? null : colorToHex(resolveVars(raw, desktopVars));
    cache.set(varName, hex);
    return hex;
  };

  // UI color layer: official theme at the bottom, Desktop on top.
  const desktopColors = mapColors(get, colorOpts || {});
  const colors = { ...official.colors };
  for (const [k, val] of Object.entries(desktopColors)) {
    if (val) colors[k] = val; // empty/unresolved values don't overwrite the official fallback
  }

  // Syntax layer: official tokenColors at the bottom, Desktop-derived on top.
  const desktopTokens = mapTokenColors(get);
  const tokenColors = [...(official.tokenColors || []), ...desktopTokens];

  return {
    $schema: 'vscode://schemas/color-theme',
    name,
    type,
    // Semantic highlighting is disabled on purpose: otherwise the official theme's
    // LSP colors would override the Desktop highlighting. We give Desktop priority.
    semanticHighlighting: false,
    colors,
    tokenColors,
  };
}

async function main() {
  const { css, label } = await getDesktopCss(SOURCE);
  const officialDir = findOfficialThemesDir();
  console.log('Desktop source :', label);
  console.log('Base (official):', officialDir);

  const { light, dark } = parseDesktopVars(css);
  console.log(`Variables: light=${Object.keys(light).length}, dark=${Object.keys(dark).length}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const variants = [
    {
      variantKey: 'light',
      name: 'GitHub Desktop Light',
      type: 'light',
      desktopVars: light,
      officialPath: path.join(officialDir, 'light-default.json'),
      out: 'github-desktop-light.json',
      // Light chrome instead of Desktop's dark toolbar (it's overpowering in the
      // light theme). We use Desktop's native light-gray panel background.
      colorOpts: { chromeBg: '--box-alt-background-color' },
    },
    {
      variantKey: 'dark',
      name: 'GitHub Desktop Dark',
      type: 'dark',
      desktopVars: dark,
      officialPath: path.join(officialDir, 'dark-default.json'),
      out: 'github-desktop-dark.json',
    },
  ];

  for (const v of variants) {
    const theme = buildVariant(v);
    const dest = path.join(OUT_DIR, v.out);
    fs.writeFileSync(dest, JSON.stringify(theme, null, 2) + '\n');
    console.log(
      `✓ ${v.out}  (colors: ${Object.keys(theme.colors).length}, tokenColors: ${theme.tokenColors.length})`
    );
  }
  console.log('Done. Reload VS Code (Developer: Reload Window) and pick the theme.');
}

main().catch((err) => {
  console.error('Generation failed:', err.message);
  process.exit(1);
});
