import { Context } from './context.js';
import { parseTemplate } from './parse-template.js';
import { escapeHtml as escapeHTML, isArray, isFunction } from './type-str.js';

export class Writer {
  constructor() {
    this.config = {
      escape: str => str,
      tags: ['{{', '}}'],
    };
    this.templateCache = new Map();
  }

  clearCache() {
    this.templateCache.clear();
  }

  parseConfig(config) {
    this.config.tags = ['{{', '}}'];
    this.config.escape = str => str;
    
    if (config) {
      if (config.tags) {
        this.config.tags = config.tags;
      }
      if (config.useEscape === false) {
        this.config.escape = value => value;
      }
    }
  }

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

  render(template, view, partials, config) {
    this.parseConfig(config);
    const tokens = this.parse(template, config);
    const context = view instanceof Context ? view : new Context(view, undefined);
    let output = this.renderTokens(tokens, context, partials, template);
    if (output.startsWith('\n')) output = output.slice(1);
    return output;
  }

  renderTokens(tokens, context, partials, originalTemplate) {
    let buffer = [];
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
      if (value !== undefined) buffer.push(value);
    }
    return buffer.join('');
  }

  escapedValue(token, context) {
    const escape = this.config.escape;
    const value = context.lookup(token[1]);
    if (value != null) {
      return typeof value === 'number' && escape === escapeHTML ? String(value) : escape(value);
    }
  }

  unescapedValue(token, context) {
    const value = context.lookup(token[1]);
    return value != null ? value : undefined;
  }

  rawValue(token) {
    return token[1];
  }

  renderSection(token, context, partials, originalTemplate) {
    const subRender = template => this.render(template, context, partials);
    let buffer = [];
    const value = context.lookup(token[1]);
    if (!value) return '';
    if (isArray(value)) {
      for (const item of value) {
        const childContext = (item != null && typeof item === 'object') ? context.push(item) : new Context(item, context);
        buffer.push(this.renderTokens(token[4], childContext, partials, originalTemplate));
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      const childContext = (value != null && typeof value === 'object') ? context.push(value) : new Context(value, context);
      buffer.push(this.renderTokens(token[4], childContext, partials, originalTemplate));
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string') throw new Error('Cannot use higher-order sections without the original template');
      const renderedValue = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
      if (renderedValue != null) buffer.push(renderedValue);
    } else {
      buffer.push(this.renderTokens(token[4], context, partials, originalTemplate));
    }
    return buffer.join('').replace(/\n{2,}/g, '\n');
  }

  renderInverted(token, context, partials, originalTemplate) {
    const value = context.lookup(token[1]);
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

  indentPartial(partial, indentation, lineHasNonSpace) {
    const filteredIndentation = indentation.replace(/[^\t ]/g, '');
    return partial.split('\n').map((line, index) => (
      line.length > 0 && (index > 0 || !lineHasNonSpace)
        ? filteredIndentation + line
        : line
    )).join('\n');
  }
}
