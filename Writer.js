import { Context } from "./Context.js";
import { mustache } from "./mustache.js";
import { isArray, isFunction } from "./typeStr.js";
import { parseTemplate } from "./parseTemplate.js";

/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
export class Writer {
  constructor() {
    this.templateCache = {
      _cache: {},
      set: function set(key, value) {
        this._cache[key] = value;
      },
      get: function get(key) {
        return this._cache[key];
      },
      clear: function clear() {
        this._cache = {};
      }
    };
  }

  /**
   * Clears all cached templates in this writer.
   */
  clearCache() {
    if (typeof this.templateCache !== 'undefined') {
      this.templateCache.clear();
    }
  }

  /**
   * Parses and caches the given `template` according to the given `tags` or
   * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
   * that is generated from the parse.
   */
  parse(template, tags) {
    const cache = this.templateCache;
    const cacheKey = `${template}:${(tags || mustache.tags).join(':')}`;
    const isCacheEnabled = typeof cache !== 'undefined';
    let tokens = isCacheEnabled ? cache.get(cacheKey) : undefined;

    if (tokens == undefined) {
      tokens = parseTemplate(template, tags);
      isCacheEnabled && cache.set(cacheKey, tokens);
    }
    return tokens;
  }

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   *
   * If the optional `config` argument is given here, then it should be an
   * object with a `tags` attribute or an `escape` attribute or both.
   * If an array is passed, then it will be interpreted the same way as
   * a `tags` attribute on a `config` object.
   *
   * The `tags` attribute of a `config` object must be an array with two
   * string values: the opening and closing tags used in the template (e.g.
   * [ "<%", "%>" ]). The default is to mustache.tags.
   *
   * The `escape` attribute of a `config` object must be a function which
   * accepts a string as input and outputs a safely escaped string.
   * If an `escape` function is not provided, then an HTML-safe string
   * escaping function is used as the default.
   */
  render(template, view, partials, config) {
    const tags = this.getConfigTags(config);
    const tokens = this.parse(template, tags);
    const context = (view instanceof Context) ? view : new Context(view, undefined);
    return this.renderTokens(tokens, context, partials, template, config);
  }

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  renderTokens(tokens, context, partials, originalTemplate, config) {
    let buffer = '';

    let token;
    let symbol;
    let value;
    for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      value = undefined;
      token = tokens[i];
      symbol = token[0];

      if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate, config);
      else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate, config);
      else if (symbol === '>') value = this.renderPartial(token, context, partials, config);
      else if (symbol === '&') value = this.unescapedValue(token, context);
      else if (symbol === 'name') value = this.escapedValue(token, context, config);
      else if (symbol === 'text') value = this.rawValue(token);

      if (value !== undefined)
        buffer += value;
    }

    return buffer;
  }

  renderSection(token, context, partials, originalTemplate, config) {
    const self = this;
    let buffer = '';
    let value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender(template) {
      return self.render(template, context, partials, config);
    }

    if (!value) return;

    if (isArray(value)) {
      for (let j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate, config);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate, config);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string')
        throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != null)
        buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate, config);
    }
    return buffer;
  }

  renderInverted(token, context, partials, originalTemplate, config) {
    const value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(token[4], context, partials, originalTemplate, config);
  }

  indentPartial(partial, indentation, lineHasNonSpace) {
    const filteredIndentation = indentation.replace(/[^ \t]/g, '');
    const partialByNl = partial.split('\n');
    for (let i = 0; i < partialByNl.length; i++) {
      if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
        partialByNl[i] = filteredIndentation + partialByNl[i];
      }
    }
    return partialByNl.join('\n');
  }

  renderPartial(token, context, partials, config) {
    if (!partials) return;
    const tags = this.getConfigTags(config);

    const value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value != null) {
      const lineHasNonSpace = token[6];
      const tagIndex = token[5];
      const indentation = token[4];
      let indentedValue = value;
      if (tagIndex == 0 && indentation) {
        indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
      }
      const tokens = this.parse(indentedValue, tags);
      return this.renderTokens(tokens, context, partials, indentedValue, config);
    }
  }

  unescapedValue(token, context) {
    const value = context.lookup(token[1]);
    if (value != null)
      return value;
  }

  escapedValue(token, context, config) {
    const escape = this.getConfigEscape(config) || mustache.escape;
    const value = context.lookup(token[1]);
    if (value != null)
      return (typeof value === 'number' && escape === mustache.escape) ? String(value) : escape(value);
  }

  rawValue(token) {
    return token[1];
  }

  getConfigTags(config) {
    if (isArray(config)) {
      return config;
    }
    else if (config && typeof config === 'object') {
      return config.tags;
    }
    else {
      return undefined;
    }
  }

  getConfigEscape(config) {
    if (config && typeof config === 'object' && !isArray(config)) {
      return config.escape;
    }
    else {
      return undefined;
    }
  }
}
