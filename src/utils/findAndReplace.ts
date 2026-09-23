/**
 * Escapes regex special characters
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a RegExp for finding text with case sensitivity and whole-word options
 */
function buildFindRegex(findText: string, caseSensitive: boolean, matchWholeWord: boolean, global: boolean = true) {
  const escaped = escapeRegExp(findText);
  const pattern = matchWholeWord ? `(?:^|(?<=[^\\p{L}\\p{N}_]))${escaped}(?=[^\\p{L}\\p{N}_]|$)` : escaped;
  const flags = (caseSensitive ? '' : 'i') + (global ? 'g' : '') + 'u';
  return new RegExp(pattern, flags);
}

/**
 * Counts occurrences of findText in text
 */
export function countMatchesInText(
  text: string,
  findText: string,
  caseSensitive: boolean = false,
  matchWholeWord: boolean = false
): number {
  if (!findText || !text) return 0;
  try {
    const regex = buildFindRegex(findText, caseSensitive, matchWholeWord, true);
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Replaces findText in text with replaceText
 */
export function replaceInText(
  text: string,
  findText: string,
  replaceText: string,
  caseSensitive: boolean = false,
  matchWholeWord: boolean = false,
  onlyFirst: boolean = false
): { result: string; count: number } {
  if (!findText || !text) return { result: text, count: 0 };
  try {
    const regex = buildFindRegex(findText, caseSensitive, matchWholeWord, !onlyFirst);
    let count = 0;
    const result = text.replace(regex, () => {
      count++;
      return replaceText;
    });
    return { result, count };
  } catch (e) {
    return { result: text, count: 0 };
  }
}
