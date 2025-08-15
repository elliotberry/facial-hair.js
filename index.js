import { typeStr as typeString } from "./lib/type-str.js";
import { Writer } from "./lib/writer.js";

const defaultWriter = new Writer();

/**
 * Parses and caches the given template in the default writer and returns the
 * array of tokens it contains. Doing this ahead of time avoids the need to
 * parse templates on the fly as they are rendered.
 */
const parse = (template, options={useEscape: true}) => {
  return defaultWriter.parse(template, options);
};

/**
 * Renders the `template` with the given `view`, `partials`, and `config`
 * using the default writer.
 */
const render = (template, view, partials, config) => {
  
  if (typeof template !== 'string') {
    throw new TypeError(`Invalid template! Template should be a "string" but "${typeString(template)}" was given as the first argument for mustache#render(template, view, partials)`);
  }

  return defaultWriter.render(template, view, partials, config);
};

const clearCache = () => {
  defaultWriter.clearCache();
};

export {parse, render, clearCache};
