import { hasProperty, isFunction,primitiveHasOwnProperty } from "./type-str.js";

/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
export class Context {
  constructor(view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  lookup(name) {
    const cache = this.cache;
    const cacheKey = name;
    let value;
    if (cache.hasOwnProperty(cacheKey)) {
      value = cache[cacheKey];
    } else {
      let context = this;
      let intermediateValue;
      let names;
      let index;
      let lookupHit = false;
      while (context) {
        if (name === '.') {
          // Special case: return the current view, even if it's a primitive
          value = context.view;
          lookupHit = true;
        } else if (name.indexOf('.') > 0) {
          intermediateValue = context.view;
          names = name.split('.');
          index = 0;
          while (intermediateValue != undefined && index < names.length) {
            if (index === names.length - 1)
              lookupHit = (
                hasProperty(intermediateValue, names[index])
                || primitiveHasOwnProperty(intermediateValue, names[index])
              );
            intermediateValue = intermediateValue[names[index++]];
          }
        } else {
          intermediateValue = context.view[name];
          lookupHit = hasProperty(context.view, name);
        }
        if (lookupHit) {
          value = value !== undefined ? value : intermediateValue;
          break;
        }
        context = context.parent;
      }
      cache[cacheKey] = value;
    }
    if (isFunction(value))
      return value.call(this.view);
    return value;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent. Avoids wrapping primitives in a new context.
   */
  push(view) {
    // If view is a primitive, just return this (no new context needed)
    if (view == null || typeof view !== 'object') {
      return this;
    }
    return new Context(view, this);
  }
}
