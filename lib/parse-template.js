import { nestTokens } from "./nest-tokens.js";
import { Scanner } from "./scanner.js";
import { squashTokens } from "./squash-tokens.js";
import { curlyRe, equalsRe, escapeRegExp, isArray, isWhitespace, spaceRe, tagRe, whiteRe } from "./type-str.js";

export function parseTemplate(template, tags) {
  if (!template) return [];

  let lineHasNonSpace = false;
  const sections = [];
  const tokens = [];
  let spaces = [];
  let hasTag = false;
  let nonSpace = false;
  let indentation = '';
  let tagIndex = 0;

  function stripSpace() {
    if (hasTag && !nonSpace) {
      while (spaces.length > 0) delete tokens[spaces.pop()];
    } else {
      spaces = [];
    }
    hasTag = false;
    nonSpace = false;
  }

  let openingTagRe;
  let closingTagRe;
  let closingCurlyRe;
  function compileTags(tagsToCompile) {
    if (typeof tagsToCompile === 'string') {
      tagsToCompile = tagsToCompile.split(spaceRe, 2);
    }

    if (!isArray(tagsToCompile) || tagsToCompile.length !== 2) {
      throw new Error(`Invalid tags: ${tagsToCompile}`);
    }

    openingTagRe = new RegExp(`${escapeRegExp(tagsToCompile[0])}\\s*`);
    closingTagRe = new RegExp(`\\s*${escapeRegExp(tagsToCompile[1])}`);
    closingCurlyRe = new RegExp(`\\s*${escapeRegExp(`}${tagsToCompile[1]}`)}`);
  }

  compileTags(tags);

  const scanner = new Scanner(template);

  while (!scanner.eos()) {
    let start = scanner.pos;
    let value = scanner.scanUntil(openingTagRe);

    if (value) {
      for (let index = 0, valueLength = value.length; index < valueLength; ++index) {
        const chr = value.charAt(index);

        if (isWhitespace(chr)) {
          spaces.push(tokens.length);
          indentation += chr;
        } else {
          nonSpace = true;
          lineHasNonSpace = true;
          indentation += ' ';
        }

        tokens.push(['text', chr, start, start + 1]);
        start += 1;

        if (chr === '\n') {
          stripSpace();
          indentation = '';
          tagIndex = 0;
          lineHasNonSpace = false;
        }
      }
    }

    if (!scanner.scan(openingTagRe)) break;

    hasTag = true;
    let type = scanner.scan(tagRe) || 'name';
    scanner.scan(whiteRe);

    if (type === '=') {
      value = scanner.scanUntil(equalsRe);
      scanner.scan(equalsRe);
      scanner.scanUntil(closingTagRe);
    } else if (type === '{') {
      value = scanner.scanUntil(closingCurlyRe);
      scanner.scan(curlyRe);
      scanner.scanUntil(closingTagRe);
      type = '&';
    } else {
      value = scanner.scanUntil(closingTagRe);
    }

    if (!scanner.scan(closingTagRe)) {
      throw new Error(`Unclosed tag at ${scanner.pos}`);
    }

    const token = type == '>' ? [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace] : [type, value, start, scanner.pos];
    tagIndex++;
    tokens.push(token);

    if (type === '#' || type === '^') {
      sections.push(token);
    } else if (type === '/') {
      const openSection = sections.pop();

      if (!openSection) {
        throw new Error(`Unopened section "${value}" at ${start}`);
      }

      if (openSection[1] !== value) {
        throw new Error(`Unclosed section "${openSection[1]}" at ${start}`);
      }
    } else if (['{', '&', 'name'].includes(type)) {
      nonSpace = true;
    } else if (type === '=') {
      compileTags(value);
    }
  }

  stripSpace();

  const openSection = sections.pop();
  if (openSection) {
    throw new Error(`Unclosed section "${openSection[1]}" at ${scanner.pos}`);
  }

  return nestTokens(squashTokens(tokens));
}
