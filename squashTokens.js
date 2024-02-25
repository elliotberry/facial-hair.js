/**
 * Combines the values of consecutive text tokens in the given `tokens` array
 * to a single token.
 */
export function squashTokens(tokens) {
  const squashedTokens = [];

  let token;
  let lastToken;
  for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];

    if (token) {
      if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        squashedTokens.push(token);
        lastToken = token;
      }
    }
  }

  return squashedTokens;
}
