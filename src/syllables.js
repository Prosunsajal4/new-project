"use strict";

const VOWELS = /[aeiouy]+/gi;

/**
 * Estimate syllables in a word using a vowel-group heuristic
 * with common English silent-e and special-case adjustments.
 */
function countSyllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;

  let count = (w.match(VOWELS) || []).length;

  // silent trailing e: "make", "time"
  if (/[^aeiouy]e$/.test(w) && count > 1) count -= 1;

  // "le" ending after a consonant: "table", "little"
  if (/[^aeiouy]le$/.test(w)) count += 1;

  // consecutive vowel pairs often form one sound: "read", "beat"
  count -= (w.match(/[aeiouy]{2,}/g) || []).length > 0 ? 0 : 0;

  return Math.max(1, count);
}

/** Split text into sentences (handles abbreviations conservatively). */
function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z"'(\[])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Extract words (letters with internal hyphens/apostrophes). */
function splitWords(sentence) {
  return sentence.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) || [];
}

module.exports = { countSyllables, splitSentences, splitWords };
