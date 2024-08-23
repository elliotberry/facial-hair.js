const objectToString = Object.prototype.toString;
export const isArray = Array.isArray || function isArrayPolyfill(object) {
  return objectToString.call(object) === '[object Array]';
};

export function isFunction(object) {
  return typeof object === 'function';
}
/**
 * More correct typeof string handling array
 * which normally returns typeof 'object'
 */
export function typeStr(object) {
  return isArray(object) ? 'array' : typeof object;
}

export function escapeRegExp(string) {
  return string.replaceAll(/[\s#$()*+,.?[\\\]^{|}\-]/g, String.raw`\$&`);
}
/**
 * Null safe way of checking whether or not an object,
 * including its prototype, has a given property
 */

export function hasProperty(object, propertyName) {
  return object != undefined && typeof object === 'object' && (propertyName in object);
}
/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 */

export function primitiveHasOwnProperty(primitive, propertyName) {
  return (
    primitive != undefined
    && typeof primitive !== 'object'
    && primitive.hasOwnProperty
    && primitive.hasOwnProperty(propertyName)
  );
}
// Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
// See https://github.com/janl/mustache.js/issues/189
const regExpTest = RegExp.prototype.test;
function testRegExp(re, string) {
  return regExpTest.call(re, string);
}
const nonSpaceRe = /\S/;
export function isWhitespace(string) {
  return !testRegExp(nonSpaceRe, string);
}


const entityMap = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&#39;',
  '/': '&#x2F;',
  '<': '&lt;',
  '=': '&#x3D;',
  '>': '&gt;',
  '`': '&#x60;'
};


export function escapeHtml(string) {
  return String(string).replaceAll(/["&'/<=>`]/g, function fromEntityMap(s) {
    return entityMap[s];
  });
}

export const whiteRe = /\s*/;
export const spaceRe = /\s+/;
export const equalsRe = /\s*=/;
export const curlyRe = /\s*}/;
export const tagRe = /[!#&/=>^{]/;
