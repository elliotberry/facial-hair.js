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
      // Emit a text token for each line and newline, as in the original logic
      let textStart = start;
      let lines = value.split('\n');
      for (let i = 0; i < lines.length; ++i) {
        let line = lines[i];
        if (line.length > 0) {
          const textToken = ['text', line, textStart, textStart + line.length];
          if (Array.isArray(textToken) && typeof textToken[0] === 'string') {
            tokens.push(textToken);
          }
          textStart += line.length;
        }
        if (i < lines.length - 1) {
          // Newline token (always push for newlines)
          const newlineToken = ['text', '\n', textStart, textStart + 1];
          if (Array.isArray(newlineToken) && typeof newlineToken[0] === 'string') {
            tokens.push(newlineToken);
          }
          textStart += 1;
          stripSpace();
          indentation = '';
          tagIndex = 0;
          lineHasNonSpace = false;
        }
      }
      // Maintain indentation and spaces for compatibility
      let lastLine = lines[lines.length - 1];
      if (lastLine) {
        for (let index = 0; index < lastLine.length; ++index) {
          const chr = lastLine.charAt(index);
          if (isWhitespace(chr)) {
            spaces.push(tokens.length - 1); // last token index
            indentation += chr;
          } else {
            nonSpace = true;
            lineHasNonSpace = true;
            indentation += ' ';
          }
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

  return nestTokens(tokens);
}
