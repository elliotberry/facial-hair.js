/**
 * Combines the values of consecutive text tokens in the given `tokens` array
 * into a single token.
 */
export function squashTokens(tokens) {
  const squashedTokens = [];
  let lastToken = null;

  for (const token of tokens) {
    if (!token) continue;

    if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
      lastToken[1] += token[1];
      lastToken[3] = token[3];
    } else {
      squashedTokens.push(token);
      lastToken = token;
    }
  }

  return squashedTokens;
}
