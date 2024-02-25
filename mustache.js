/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

import { Context } from "./Context.js";
import { Scanner } from "./Scanner.js";
import { Writer } from "./Writer.js";
import { typeStr, escapeHtml } from "./typeStr.js";

export var mustache = {

  tags: [ '{{', '}}' ],
  clearCache: undefined,
  escape: undefined,
  parse: undefined,
  render: undefined,
  Scanner: undefined,
  Context: undefined,
  Writer: undefined,
  /**
   * Allows a user to override the default caching strategy, by providing an
   * object with set, get and clear methods. This can also be used to disable
   * the cache by setting it to the literal `undefined`.
   */
  set templateCache(cache) {
    defaultWriter.templateCache = cache;
  },
  /**
   * Gets the default or overridden caching object from the default writer.
   */
  get templateCache() {
    return defaultWriter.templateCache;
  }
};

// All high-level mustache.* functions use this writer.
var defaultWriter = new Writer();

/**
 * Clears all cached templates in the default writer.
 */
const clearCache = function() {
  return defaultWriter.clearCache();
};
mustache.clearCache = clearCache;

/**
 * Parses and caches the given template in the default writer and returns the
 * array of tokens it contains. Doing this ahead of time avoids the need to
 * parse templates on the fly as they are rendered.
 */
const parse = function(template, tags) {
  return defaultWriter.parse(template, tags);
};
mustache.parse = parse;
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
mustache.render = render;
// Export the escaping function so that the user may override it.
// See https://github.com/janl/mustache.js/issues/244
mustache.escape = escapeHtml;

// Export these mainly for testing, but also for advanced usage.
mustache.Scanner = Scanner;
mustache.Context = Context;
mustache.Writer = Writer;

export default mustache;
