
function syllables(word) {
  const groups = word.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 0);
}

// Flesch reading ease: 100 = very easy, 0 = very hard.
// The raw formula can leave 0-100 (e.g. 116 or -180), so it is clamped.
function flesch(text) {
  const words = text.match(/\p{L}+(?:'\p{L}+)*/gu) ?? [];
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
  const syllableCount = words.reduce((sum, w) => sum + syllables(w), 0);
  const score = words.length === 0 ? null
    : 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllableCount / words.length);
  return {
    score: score === null ? null : Math.round(Math.min(100, Math.max(0, score)) * 10) / 10,
    sentences,
    words: words.length,
    syllables: syllableCount,
  };
}

module.exports = { syllables, flesch };
