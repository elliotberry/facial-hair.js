import { Context } from './context.js';
import { parseTemplate } from './parse-template.js';
import { escapeHtml as escapeHTML, isArray, isFunction } from './type-str.js';

/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
export class Writer {
  constructor() {
    this.config = {
      escape: str => str,
      tags: ['{{', '}}'],
    };

    this.templateCache = new Map();
  }

  /**
   * Clears all cached templates in this writer.
   */
  clearCache() {
    this.templateCache.clear();
  }

  escapedValue(token, context) {
    const escape = this.config.escape;
    const value = context.lookup(token[1]);
    if (value != null) {
      return typeof value === 'number' && escape === escapeHTML ? String(value) : escape(value);
    }
  }

  indentPartial(partial, indentation, lineHasNonSpace) {
    const filteredIndentation = indentation.replace(/[^\t ]/g, '');
    return partial.split('\n').map((line, index) => (
      line.length > 0 && (index > 0 || !lineHasNonSpace)
        ? filteredIndentation + line
        : line
    )).join('\n');
  }

  /**
   * Parses and caches the given `template` according to the given `tags` or
   * `mustache.tags` if `tags` is omitted, and returns the array of tokens
   * that is generated from the parse.
   */
  parse(template, options) {
    this.parseConfig(options);
    const tags = this.config.tags;
    const cacheKey = `${template}:${tags.join(':')}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }
    
    const tokens = parseTemplate(template, tags);
    this.templateCache.set(cacheKey, tokens);

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
    if (!config) return;

    if (config.tags) {
      this.config.tags = config.tags;
    }

    if (config.useEscape === false) {
      this.config.escape = value => value;
    }
  }

  rawValue(token) {
    return token[1];
  }

  render(template, view, partials, config) {
    this.parseConfig(config);
    const tokens = this.parse(template, this.config.tags);
    const context = view instanceof Context ? view : new Context(view, undefined);
    return this.renderTokens(tokens, context, partials, template);
  }

  renderInverted(token, context, partials, originalTemplate) {
    const value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0)) {
      return this.renderTokens(token[4], context, partials, originalTemplate);
    }
  }

  renderPartial(token, context, partials) {
    if (!partials) return;

    const value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value == undefined) return;

    const { lineHasNonSpace, tagIndex, indentation } = token;

    const indentedValue = tagIndex === 0 && indentation 
      ? this.indentPartial(value, indentation, lineHasNonSpace) 
      : value;

    const tokens = this.parse(indentedValue, this.config.tags);
    return this.renderTokens(tokens, context, partials, indentedValue);
  }

  renderSection(token, context, partials, originalTemplate) {
    const subRender = template => this.render(template, context, partials);

    let buffer = '';
    const value = context.lookup(token[1]);

    if (!value) return '';

    if (isArray(value)) {
      for (const item of value) {
        buffer += this.renderTokens(token[4], context.push(item), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string') throw new Error('Cannot use higher-order sections without the original template');

      const renderedValue = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
      if (renderedValue != null) buffer += renderedValue;
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

    for (const token of tokens) {
      const symbol = token[0];
      let value;

      switch (symbol) {
        case '#':
          value = this.renderSection(token, context, partials, originalTemplate);
          break;
        case '^':
          value = this.renderInverted(token, context, partials, originalTemplate);
          break;
        case '>':
          value = this.renderPartial(token, context, partials);
          break;
        case '&':
          value = this.unescapedValue(token, context);
          break;
        case 'name':
          value = this.escapedValue(token, context);
          break;
        case 'text':
          value = this.rawValue(token);
          break;
      }

      if (value !== undefined) buffer += value;
    }

    return buffer;
  }

  unescapedValue(token, context) {
    const value = context.lookup(token[1]);
    return value != null ? value : undefined;
  }
}
