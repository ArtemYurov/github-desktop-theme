// Mapping of GitHub Desktop variables → VS Code theme tokens.
//
// All of the "design" logic lives here: which VS Code UI element corresponds to
// which Desktop CSS variable. Variable names come from app/styles/_variables.scss
// in the desktop/desktop repo (and are present in the built renderer.css). If a
// variable is missing or does not resolve to a color, the token is skipped and
// the official filler theme's value remains.

// ---------------------------------------------------------------------------
// UI colors (workbench.colorCustomizations)
// ---------------------------------------------------------------------------

/**
 * @param {(name: string) => (string|null)} g — getter for a hex by Desktop variable name.
 * @returns {Object<string,string>} VS Code tokens.
 */
export function mapColors(g, opts = {}) {
  // Core "semantic" Desktop colors that everything below builds on.
  const bg = g('--background-color'); // main background (#fff / #24292e)
  const fg = g('--text-color'); // main text
  const fgSecondary = g('--text-secondary-color'); // muted text
  const boxBg = g('--box-background-color'); // card/panel background
  const boxAlt = g('--box-alt-background-color'); // alternating background (#f6f8fa)
  const boxBorder = g('--box-border-color'); // borders
  const boxHover = g('--list-item-hover-background-color') || g('--box-hover-background-color');
  const selActiveBg = g('--box-selected-active-background-color'); // active selection (blue)
  const selActiveFg = g('--box-selected-active-text-color') || '#ffffff';
  const selBg = g('--box-selected-background-color'); // inactive selection
  // The dark toolbar is a signature trait of Desktop (dark even in the light theme).
  // But it's overpowering in the light theme, so opts.chromeBg lets us replace it
  // with a light background from the Desktop palette (e.g. --box-alt-background-color).
  // In that case the text/borders are tuned for a light background.
  let toolbarBg = g('--toolbar-background-color');
  let toolbarFg = g('--toolbar-text-color');
  let toolbarFg2 = g('--toolbar-text-secondary-color');
  let toolbarBorder = g('--toolbar-border-color');
  if (opts.chromeBg) {
    toolbarBg = g(opts.chromeBg) || opts.chromeBg;
    toolbarFg = fg;
    toolbarFg2 = fgSecondary;
    toolbarBorder = boxBorder;
  }
  const accent = g('--button-background') || g('--box-selected-active-background-color'); // #0366d6
  const accentText = g('--button-text-color') || '#ffffff';
  const accentHover = g('--button-hover-background');
  const link = g('--link-button-color');
  // Diff. Desktop uses a single flat row background with no word-level fill.
  const diffAddLine = g('--diff-add-background-color');
  const diffDelLine = g('--diff-delete-background-color');
  const diffHunk = g('--diff-hunk-background-color');
  const ok = g('--status-success-color'); // green
  const danger = g('--pr-changes-requested-icon-background-color') || g('--md-danger-fg-color');

  const c = {};
  const set = (k, v) => {
    if (v) c[k] = v;
  };

  // --- Base ---
  set('foreground', fg);
  set('focusBorder', accent);
  set('descriptionForeground', fgSecondary);
  set('disabledForeground', fgSecondary);
  set('errorForeground', danger);
  set('icon.foreground', fgSecondary);
  set('selection.background', selActiveBg);
  set('widget.border', boxBorder);
  set('contrastBorder', boxBorder);

  // --- Editor (main area, like Desktop's diff pane) ---
  set('editor.background', bg);
  set('editor.foreground', fg);
  set('editorCursor.foreground', fg);
  set('editorLineNumber.foreground', fgSecondary);
  set('editorLineNumber.activeForeground', fg);
  set('editorWhitespace.foreground', boxBorder);
  set('editorIndentGuide.background1', boxBorder);
  set('editorIndentGuide.activeBackground1', fgSecondary);
  set('editor.selectionBackground', selBg);
  set('editor.lineHighlightBackground', boxAlt);
  set('editorWidget.background', boxBg);
  set('editorWidget.border', boxBorder);
  set('editorGroup.border', boxBorder);
  set('editorGroupHeader.tabsBackground', boxAlt);
  set('editorGroupHeader.tabsBorder', boxBorder);

  // --- Desktop toolbar → titleBar / activityBar / statusBar (unified chrome) ---
  set('titleBar.activeBackground', toolbarBg);
  set('titleBar.activeForeground', toolbarFg);
  set('titleBar.inactiveBackground', toolbarBg);
  set('titleBar.inactiveForeground', toolbarFg2);
  set('titleBar.border', toolbarBorder);

  set('activityBar.background', toolbarBg);
  set('activityBar.foreground', toolbarFg);
  set('activityBar.inactiveForeground', toolbarFg2);
  set('activityBar.border', toolbarBorder);
  set('activityBarBadge.background', accent);
  set('activityBarBadge.foreground', accentText);

  set('statusBar.background', toolbarBg);
  set('statusBar.foreground', toolbarFg);
  set('statusBar.border', toolbarBorder);
  set('statusBar.noFolderBackground', toolbarBg);
  set('statusBar.debuggingBackground', accent);
  set('statusBarItem.remoteBackground', accent);
  set('statusBarItem.remoteForeground', accentText);
  set('statusBarItem.hoverBackground', g('--toolbar-button-hover-background-color'));

  // --- Side bar (file/history lists — white, like Desktop) ---
  set('sideBar.background', bg);
  set('sideBar.foreground', fg);
  set('sideBar.border', boxBorder);
  set('sideBarTitle.foreground', fg);
  set('sideBarSectionHeader.background', boxAlt);
  set('sideBarSectionHeader.foreground', fg);
  set('sideBarSectionHeader.border', boxBorder);

  // --- Lists and trees ---
  set('list.hoverBackground', boxHover);
  set('list.activeSelectionBackground', selActiveBg);
  set('list.activeSelectionForeground', selActiveFg);
  set('list.inactiveSelectionBackground', selBg);
  set('list.inactiveSelectionForeground', fg);
  set('list.focusBackground', selActiveBg);
  set('list.focusForeground', selActiveFg);
  set('list.highlightForeground', link);
  set('tree.indentGuidesStroke', boxBorder);

  // --- Tabs ---
  set('tab.activeBackground', bg);
  set('tab.activeForeground', fg);
  set('tab.inactiveBackground', boxAlt);
  set('tab.inactiveForeground', fgSecondary);
  set('tab.border', boxBorder);
  set('tab.activeBorderTop', g('--tab-bar-active-color') || accent);
  set('tab.hoverBackground', boxHover);

  // --- Buttons ---
  set('button.background', accent);
  set('button.foreground', accentText);
  set('button.hoverBackground', accentHover);
  set('button.secondaryBackground', g('--secondary-button-background'));
  set('button.secondaryForeground', g('--secondary-button-text-color') || fg);

  // --- Inputs / dropdowns ---
  set('input.background', boxBg);
  set('input.foreground', fg);
  set('input.border', boxBorder);
  set('input.placeholderForeground', fgSecondary);
  set('dropdown.background', boxBg);
  set('dropdown.foreground', fg);
  set('dropdown.border', boxBorder);
  set('checkbox.background', boxBg);
  set('checkbox.border', boxBorder);

  // --- Text links / accents ---
  set('textLink.foreground', link);
  set('textLink.activeForeground', link);
  set('editorLink.activeForeground', link);

  // --- Panel / terminal ---
  set('panel.background', bg);
  set('panel.border', boxBorder);
  set('panelTitle.activeForeground', fg);
  set('panelTitle.inactiveForeground', fgSecondary);
  set('terminal.background', bg);
  set('terminal.foreground', fg);

  // --- Scrollbar ---
  set('scrollbarSlider.background', g('--scroll-bar-thumb-color') || `${overlay(fgSecondary, 0.2)}`);
  set('scrollbarSlider.hoverBackground', g('--scroll-bar-thumb-hover-color') || `${overlay(fgSecondary, 0.3)}`);

  // --- Diff ---
  // Like GitHub Desktop: one flat row background, no word-level highlight.
  // The line colors are Desktop's own opaque backgrounds; the *Text* tokens are
  // forced transparent to suppress the official theme's word-level fill.
  set('diffEditor.insertedLineBackground', diffAddLine);
  set('diffEditor.removedLineBackground', diffDelLine);
  set('diffEditor.insertedTextBackground', '#00000000');
  set('diffEditor.removedTextBackground', '#00000000');
  set('editorGutter.addedBackground', ok);
  set('editorGutter.deletedBackground', danger);
  set('editorGutter.modifiedBackground', link);

  // Git decorations (file-tree status colors) are intentionally NOT mapped:
  // Desktop shows status via icons, not name color, so it has no good source
  // color. The official theme's values (modified/added/deleted/...) are correct
  // and readable, so we keep them from the filler layer.

  // --- Badges / notifications ---
  set('badge.background', accent);
  set('badge.foreground', accentText);
  set('notificationCenterHeader.background', boxAlt);
  set('notifications.background', boxBg);
  set('notifications.border', boxBorder);

  return c;
}

// Adds alpha to a hex color (#rrggbb → #rrggbbAA). If it already has alpha or is
// null, returns it unchanged. Needed because Desktop's diff backgrounds are opaque
// while VS Code overlays them on top of code — translucency keeps text readable.
function overlay(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  if (hex.length === 9) return hex; // already #rrggbbaa
  if (hex.length !== 7) return hex;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

// ---------------------------------------------------------------------------
// Syntax highlighting (tokenColors) from the Desktop palette (--syntax-*)
// ---------------------------------------------------------------------------

/**
 * Desktop's CodeMirror palette is small (~14 colors), so we distribute it across
 * TextMate scopes by the meaning of each color (matching GitHub's syntax). These
 * rules go ON TOP of the official tokenColors, overriding them for key constructs.
 */
export function mapTokenColors(g) {
  const rules = [];
  const add = (scope, color) => {
    if (color) rules.push({ scope, settings: { foreground: color } });
  };

  const keyword = g('--syntax-keyword-color');
  const type = g('--syntax-type-color');
  const variable = g('--syntax-variable-color'); // purple → functions/entities (GitHub style)
  const altVariable = g('--syntax-alt-variable-color'); // ordinary identifiers/parameters
  const atom = g('--syntax-atom-color'); // numbers, constants, booleans
  const string = g('--syntax-string-color');
  const comment = g('--syntax-comment-color');
  const tag = g('--syntax-tag-color');
  const attribute = g('--syntax-attribute-color');
  const qualifier = g('--syntax-qualifier-color'); // classes/qualifiers
  const link = g('--syntax-link-color');
  const header = g('--syntax-header-color');
  const quote = g('--syntax-quote-color');

  add(['comment', 'punctuation.definition.comment', 'string.comment'], comment);
  add(
    ['keyword', 'keyword.control', 'keyword.operator.expression', 'storage', 'storage.type', 'storage.modifier'],
    keyword
  );
  add(['entity.name.type', 'support.type', 'support.class', 'entity.name.namespace'], type);
  add(['entity.name.class', 'entity.other.inherited-class', 'support.other.namespace'], qualifier);
  add(
    ['entity.name.function', 'support.function', 'meta.function-call.generic', 'entity.name.function.member'],
    variable
  );
  add(
    ['variable', 'variable.other', 'variable.parameter', 'meta.definition.variable', 'variable.other.readwrite'],
    altVariable
  );
  add(
    [
      'constant',
      'constant.numeric',
      'constant.language',
      'constant.character',
      'constant.other',
      'keyword.other.unit',
      'support.constant',
    ],
    atom
  );
  add(
    ['string', 'string.quoted', 'string.template', 'punctuation.definition.string', 'string.regexp'],
    string
  );
  add(['entity.name.tag', 'punctuation.definition.tag'], tag);
  add(['entity.other.attribute-name', 'support.type.property-name'], attribute);
  add(['markup.underline.link', 'string.other.link', 'markup.link'], link);
  add(['markup.heading', 'markup.heading entity.name', 'entity.name.section'], header);
  add(['markup.quote', 'markup.inserted', 'meta.diff.header'], quote);

  return rules;
}
