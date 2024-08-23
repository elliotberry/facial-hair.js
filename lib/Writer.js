import {Context} from './context.js';
import {parseTemplate} from './parse-template.js';
import {escapeHtml as escapeHTML} from './type-str.js';
import {isArray, isFunction} from './type-str.js';

/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
export class Writer {
  constructor() {
    this.config = {
      escape: function(){},
      tags: ['{{', '}}'],
    };
  
    this.templateCache = {
      _cache: {},
      clear() {
        this._cache = {};
      },
      get(key) {
        return this._cache[key];
      },
      set(key, value) {
        this._cache[key] = value;
      },
    };
  }

  /**
   * Clears all cached templates in this writer.
   */
  clearCache() {
    if (this.templateCache !== undefined) {
      this.templateCache.clear();
    }
  }

  escapedValue(token, context) {
    const escape = this.config.escape;
    const value = context.lookup(token[1]);
    if (value != undefined) return typeof value === 'number' && escape === escapeHTML ? String(value) : escape(value);
  }

  indentPartial(partial, indentation, lineHasNonSpace) {
    const filteredIndentation = indentation.replaceAll(/[^\t ]/g, '');
    const partialByNl = partial.split('\n');
    for (let index = 0; index < partialByNl.length; index++) {
      if (partialByNl[index].length > 0 && (index > 0 || !lineHasNonSpace)) {
        partialByNl[index] = filteredIndentation + partialByNl[index];
      }
    }
    return partialByNl.join('\n');
  }

  /**
   * Parses and caches the given `template` according to the given `tags` or
   * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
   * that is generated from the parse.
   */
  parse(template, options) {
    this.parseConfig(options);
    const tags = this.config.tags;
    const cache = this.templateCache;
    const cacheKey = `${template}:${tags.join(':')}`;
    const isCacheEnabled = cache !== undefined;
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
  parseConfig(config) {
    if (config == undefined) return;
    if (config.tags) {
      this.tags = config.tags;
    }
    if (config.useEscape === false) {
      this.config.escape = function (value) {
        return value;
      };
    }
  }

  rawValue(token) {
    return token[1];
  }

  render(template, view, partials, config) {
  
    this.parseConfig(config);
    const tags = this.config.tags;
    const tokens = this.parse(template, tags);
    const context = view instanceof Context ? view : new Context(view, undefined);
    return this.renderTokens(tokens, context, partials, template);
  }

  renderInverted(token, context, partials, originalTemplate) {
    const value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0)) return this.renderTokens(token[4], context, partials, originalTemplate);
  }

  renderPartial(token, context, partials) {
    if (!partials) return;
    const tags = this.config.tags;

    const value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value == undefined) {
      return;
    }
    const lineHasNonSpace = token[6];
    const tagIndex = token[5];
    const indentation = token[4];
    let indentedValue = value;
    if (tagIndex == 0 && indentation) {
      indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
    }
    const tokens = this.parse(indentedValue, tags);
    return this.renderTokens(tokens, context, partials, indentedValue);
  }

  renderSection(token, context, partials, originalTemplate) {
    const self = this;
    let buffer = '';
    let value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender(template) {
      return self.render(template, context, partials);
    }

    if (!value) return;

    if (isArray(value)) {
      for (let index = 0, valueLength = value.length; index < valueLength; ++index) {
        buffer += this.renderTokens(token[4], context.push(value[index]), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string') throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != undefined) buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate);
    }
    return buffer;
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
  renderTokens(tokens, context, partials, originalTemplate) {
    let buffer = '';

    let token;
    let symbol;
    let value;
    for (let index = 0, numberTokens = tokens.length; index < numberTokens; ++index) {
      value = undefined;
      token = tokens[index];
      symbol = token[0];

      if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
      else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
      else if (symbol === '>') value = this.renderPartial(token, context, partials);
      else if (symbol === '&') value = this.unescapedValue(token, context);
      else if (symbol === 'name') value = this.escapedValue(token, context);
      else if (symbol === 'text') value = this.rawValue(token);

      if (value !== undefined) buffer += value;
    }

    return buffer;
  }

  unescapedValue(token, context) {
    const value = context.lookup(token[1]);
    if (value != undefined) return value;
  }
 

}
