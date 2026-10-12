"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { analyze, gradeLabel, isComplexWord } = require("../src/readability");

const SIMPLE =
  "The cat sat on the mat. The dog ran to the park. Kids like to play games.";
const DENSE =
  "The implementation of the aforementioned configuration methodology " +
  "necessitates considerable conceptualization regarding the fundamental " +
  "characterization of extraordinarily multifunctional architectural " +
  "infrastructure. Institutional transformation essentially requires " +
  "comprehensive coordination.";

test("simple text scores a low grade level", () => {
  const r = analyze(SIMPLE);
  assert.ok(r.summary.gradeLevel < 5, `expected < 5, got ${r.summary.gradeLevel}`);
});

test("dense text scores a higher grade than simple text", () => {
  const simple = analyze(SIMPLE).summary.gradeLevel;
  const dense = analyze(DENSE).summary.gradeLevel;
  assert.ok(dense > simple, `dense ${dense} should exceed simple ${simple}`);
});

test("summary reports word, sentence, and unique-word counts", () => {
  const r = analyze(SIMPLE);
  assert.equal(r.summary.words, 17);
  assert.equal(r.summary.sentences, 3);
  assert.ok(r.summary.uniqueWords > 0);
  assert.ok(r.summary.uniqueWords <= r.summary.words);
});

test("flags long sentences over 25 words", () => {
  const long = Array.from({ length: 30 }, () => "word").join(" ") + ".";
  const r = analyze(long);
  assert.ok(r.issues.some((i) => i.issues.includes("long-sentence")));
});

test("flags passive voice", () => {
  const r = analyze("The decision was made by the committee.");
  assert.ok(r.issues.some((i) => i.issues.includes("passive-voice")));
});

test("flags hedging words", () => {
  const r = analyze("This is just very simply the best approach.");
  assert.ok(r.issues.some((i) => i.issues.includes("hedging")));
});

test("flags sentences that are mostly complex words", () => {
  const r = analyze(DENSE);
  assert.ok(r.issues.some((i) => i.issues.includes("complex-words")));
});

test("empty text does not throw and reports zeros", () => {
  const r = analyze("");
  assert.equal(r.summary.words, 0);
  assert.equal(r.summary.sentences, 0);
  assert.equal(r.summary.gradeLevel, 0);
});

test("gradeLabel buckets by grade", () => {
  assert.match(gradeLabel(4), /Easy/);
  assert.match(gradeLabel(7), /Plain/);
  assert.match(gradeLabel(11), /Difficult/);
  assert.match(gradeLabel(15), /Very difficult/);
});

test("isComplexWord detects polysyllabic and suffixed words", () => {
  assert.ok(isComplexWord("configuration"));
  assert.ok(isComplexWord("extraordinary"));
  assert.ok(!isComplexWord("cat"));
  assert.ok(!isComplexWord("the"));
});

test("markdown syntax does not inflate the score", () => {
  const prose = "The cat sat on the mat. The dog ran to the park.";
  const fenced = "```yaml\nsome: very difficult configuration data\n```\n" + prose;
  assert.equal(analyze(fenced).summary.gradeLevel, analyze(prose).summary.gradeLevel);
  assert.equal(analyze(fenced).summary.words, analyze(prose).summary.words);
});

test("markdown tables and code are excluded from word counts", () => {
  const md = "| alpha | beta |\n| --- | --- |\n| one | two |";
  assert.equal(analyze(md).summary.words, 0);
});
