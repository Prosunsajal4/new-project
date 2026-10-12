"use strict";

const { countSyllables, splitSentences, splitWords } = require("./syllables");

const PASSIVE_RE =
  /\b(am|is|are|was|were|be|been|being)\s+(\w+ed|written|made|taken|given|shown|known|built|sent|held|kept|told|lost|found|sold|chosen)\b/i;

const HEDGE_WORDS = new Set([
  "actually", "basically", "essentially", "literally", "simply",
  "just", "quite", "rather", "very", "really",
]);

const COMPLEX_SUFFIXES = [
  "ization", "isation", "ability", "ible", "ance", "ence", "ment",
  "tion", "sion", "ology", "ology", "ously", "ively", "ously",
];

function avg(nums) {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Strip Markdown down to prose so code fences, tables, links, and
 * syntax do not skew the readability scores.
 */
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/^\s*\|.*\|\s*$/gm, " ") // table rows
    .replace(/^\s*[-*+]\s+/gm, " ") // list bullets
    .replace(/^\s*\d+\.\s+/gm, " ") // ordered list markers
    .replace(/^#{1,6}\s+/gm, " ") // ATX heading markers
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // keep link text, drop target
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // keep image alt text
    .replace(/^\s*>\s?/gm, " ") // blockquote markers
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic/strikethrough
    .replace(/^\s*(=+|-{2,})\s*$/gm, " ") // setext heading underline
    .replace(/\s+/g, " ")
    .trim();
}

function readingEase(words, sentences, syllables) {
  if (words === 0 || sentences === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

function gradeLevel(words, sentences, syllables) {
  if (words === 0 || sentences === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

function isComplexWord(word) {
  const w = word.toLowerCase();
  if (countSyllables(w) >= 3) return true;
  return COMPLEX_SUFFIXES.some((s) => w.endsWith(s));
}

/**
 * Gunning Fog index: estimates years of schooling needed.
 * Uses 100-word samples for stability on short texts.
 */
function gunningFog(text) {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  if (words.length === 0 || sentences.length === 0) return 0;
  const complex = words.filter(isComplexWord).length;
  const pctComplex = (complex / words.length) * 100;
  const avgWordsPerSentence = words.length / sentences.length;
  return 0.4 * (avgWordsPerSentence + pctComplex);
}

/**
 * Coleman-Liau index: character-based grade estimate.
 */
function colemanLiau(text) {
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const words = splitWords(text).length;
  const sentences = splitSentences(text).length;
  if (words === 0 || sentences === 0) return 0;
  const L = (letters / words) * 100;
  const S = (sentences / words) * 100;
  return 0.0588 * L - 0.296 * S - 15.8;
}

/**
 * SMOG index: designed for health/safety materials; needs >=30 sentences
 * to be reliable, so we flag low-confidence results.
 */
function smog(text) {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  if (sentences.length < 3) return { score: 0, reliable: false };
  const complex = words.filter(isComplexWord).length;
  const score = 1.0430 * Math.sqrt(complex * (30 / sentences.length)) + 3.1291;
  return { score, reliable: sentences.length >= 30 };
}

function analyze(text) {
  const prose = stripMarkdown(text);
  const sentences = splitSentences(prose);
  const sentenceData = sentences.map((raw) => {
    const words = splitWords(raw);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const complexWords = words.filter(isComplexWord);
    const hedges = words.filter((w) => HEDGE_WORDS.has(w.toLowerCase()));

    const issues = [];
    if (words.length > 25) issues.push("long-sentence");
    if (PASSIVE_RE.test(raw)) issues.push("passive-voice");
    if (complexWords.length > words.length / 3 && words.length > 5)
      issues.push("complex-words");
    if (hedges.length > 0) issues.push("hedging");

    return { text: raw, words: words.length, syllables, complexWords: complexWords.length, issues };
  });

  const totalWords = sentenceData.reduce((s, d) => s + d.words, 0);
  const totalSyllables = sentenceData.reduce((s, d) => s + d.syllables, 0);
  const numSentences = sentenceData.length;
  const uniqueWords = new Set(
    sentences.flatMap((s) => splitWords(s).map((w) => w.toLowerCase()))
  );
  const flagged = sentenceData.filter((d) => d.issues.length > 0);

  const fk = gradeLevel(totalWords, numSentences, totalSyllables);
  const fog = gunningFog(prose);
  const cli = colemanLiau(prose);
  const sm = smog(prose);

  const scores = [fk, fog, cli, sm.score];
  const consensus = Math.round((avg(scores) + Number.EPSILON) * 10) / 10;

  return {
    summary: {
      words: totalWords,
      sentences: numSentences,
      uniqueWords: uniqueWords.size,
      avgSentenceLength: numSentences ? Math.round(totalWords / numSentences) : 0,
      readingEase: Math.round(readingEase(totalWords, numSentences, totalSyllables) * 10) / 10,
      gradeLevel: Math.round((fk + Number.EPSILON) * 10) / 10,
      gunningFog: Math.round((fog + Number.EPSILON) * 10) / 10,
      colemanLiau: Math.round((cli + Number.EPSILON) * 10) / 10,
      smog: Math.round((sm.score + Number.EPSILON) * 10) / 10,
      smogReliable: sm.reliable,
      consensusGrade: consensus,
      flagCount: flagged.length,
    },
    sentences: sentenceData,
    issues: flagged,
  };
}

function gradeLabel(grade) {
  if (grade < 6) return "Easy (general audience)";
  if (grade < 8) return "Plain (most adults)";
  if (grade < 10) return "Moderate";
  if (grade < 13) return "Difficult (college level)";
  return "Very difficult";
}

module.exports = {
  analyze, gradeLabel, readingEase, gradeLevel,
  gunningFog, colemanLiau, smog, isComplexWord,
};
