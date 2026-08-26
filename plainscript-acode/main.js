// PlainScript Language — Acode plugin
//
// Registers a CodeMirror 6 language for `.ps` files through Acode's modern
// `editorLanguages` API, with a documented fallback to the legacy `aceModes`
// API for Acode builds that do not expose `editorLanguages` yet (e.g. the
// older Ace-based builds). The highlighting rules live in stream-spec.js
// (pure CommonJS, no CodeMirror dependency) so they can be tested by the
// PlainScript test suite (tests/compiler.test.js) with the exact same code the
// editor runs.

const PlinjsStreamSpec = require('./stream-spec.js');

const PLUGIN_ID = 'dev.ayoistooslick.plainscript-language';
const LANGUAGE_NAME = 'PlainScript';
const EXTENSIONS = ['ps'];

// Build the CodeMirror 6 language extension from the module graph Acode
// exposes through acode.require. Called lazily by Acode as the loader.
function buildLanguage(acodeApi) {
  const { StreamLanguage } = acodeApi.require('@codemirror/language');
  const { tags } = acodeApi.require('@lezer/highlight');

  // Explicitly map the legacy token names this spec emits so highlighting
  // does not depend on StreamLanguage's built-in default table.
  return [
    StreamLanguage.define({
      ...PlinjsStreamSpec,
      tokenTable: {
        function: tags.function(tags.variableName),
        builtin: tags.standard(tags.variableName),
        'string-2': tags.special(tags.string),
        'string-3': tags.special(tags.special(tags.string)),
        property: tags.propertyName,
        meta: tags.meta,
        atom: tags.atom,
        invalid: tags.invalid,
      },
      languageData: {
        commentTokens: { line: '//' },
      },
    }),
  ];
}

class PlainscriptLanguagePlugin {
  constructor(acodeApi) {
    this.acode = acodeApi;
    this.registration = null; // { path: 'editorLanguages' | 'aceModes', module }
  }

  // Register the .ps language, preferring the modern editorLanguages API and
  // falling back to the legacy aceModes API. Throws (rejecting the returned
  // promise) with a descriptive message when neither API is available, so the
  // failure is never the raw "Cannot read properties of undefined (reading
  // 'register')" TypeError. The path actually used is stored on
  // `this.registration` for cleanup.
  async init() {
    const requireFn = this.acode && typeof this.acode.require === 'function'
      ? this.acode.require.bind(this.acode)
      : null;
    if (!requireFn) {
      const message = '[PlainScript] acode.require is unavailable; cannot register the .ps language.';
      console.error(message);
      throw new Error(message);
    }

    const editorLanguages = requireFn('editorLanguages');
    if (editorLanguages && typeof editorLanguages.register === 'function') {
      await editorLanguages.register(
        LANGUAGE_NAME,
        EXTENSIONS,
        LANGUAGE_NAME,
        () => buildLanguage(this.acode),
      );
      this.registration = { path: 'editorLanguages', module: editorLanguages };
      return this.registration.path;
    }

    const aceModes = requireFn('aceModes');
    if (aceModes && typeof aceModes.addMode === 'function') {
      await aceModes.addMode(LANGUAGE_NAME, EXTENSIONS, LANGUAGE_NAME);
      this.registration = { path: 'aceModes', module: aceModes };
      return this.registration.path;
    }

    const message = '[PlainScript] Acode does not expose "editorLanguages" or "aceModes" via acode.require; cannot register the .ps language.';
    console.error(message);
    throw new Error(message);
  }

  // Clean up using whichever registration path was actually used.
  destroy() {
    if (!this.registration) return;
    const { path, module } = this.registration;
    try {
      if (path === 'editorLanguages') {
        if (typeof module.unregister === 'function') module.unregister(LANGUAGE_NAME);
        else if (typeof module.remove === 'function') module.remove(LANGUAGE_NAME);
      } else if (path === 'aceModes') {
        if (typeof module.removeMode === 'function') module.removeMode(LANGUAGE_NAME);
      }
    } finally {
      this.registration = null;
    }
  }
}

// Export for the PlainScript test suite (Node). Acode runs main.js as a classic
// script where `module`/`exports` may not exist, so the export is guarded.
if (typeof module !== 'undefined' && module && module.exports) {
  module.exports = { PLUGIN_ID, LANGUAGE_NAME, EXTENSIONS, buildLanguage, PlainscriptLanguagePlugin };
}

// Acode plugin wiring. The `acode` global is only present inside Acode.
if (typeof acode !== 'undefined' && acode) {
  const plainscriptLanguagePlugin = new PlainscriptLanguagePlugin(acode);
  acode.setPluginInit(PLUGIN_ID, () => plainscriptLanguagePlugin.init());
  acode.setPluginUnmount(PLUGIN_ID, () => plainscriptLanguagePlugin.destroy());
}
