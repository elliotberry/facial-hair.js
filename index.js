/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

import { Context } from "./Context.js";
import { Scanner } from "./Scanner.js";
import { Writer } from "./Writer.js";
import { typeStr, escapeHtml } from "./typeStr.js";

var tags = [ '{{', '}}' ];

// All high-level mustache.* functions use this writer.
var defaultWriter = new Writer();

/**
 * Clears all cached templates in the default writer.
 */
const clearCache = function() {
  return defaultWriter.clearCache();
};


/**
 * Parses and caches the given template in the default writer and returns the
 * array of tokens it contains. Doing this ahead of time avoids the need to
 * parse templates on the fly as they are rendered.
 */
const parse = function(template, tags) {
  return defaultWriter.parse(template, tags);
};

/**
 * Renders the `template` with the given `view`, `partials`, and `config`
 * using the default writer.
 */
const render = function(template, view, partials, config) {
  if (typeof template !== 'string') {
    throw new TypeError(`Invalid template! Template should be a "string" but "${typeStr(template)}" was given as the first argument for mustache#render(template, view, partials)`);
  }

  return defaultWriter.render(template, view, partials, config);
};


export {Scanner, Context, Writer, escapeHtml, typeStr, render, parse, clearCache, tags};
