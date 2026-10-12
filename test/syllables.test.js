"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { countSyllables } = require("../src/syllables");

test("counts a single syllable for short words", () => {
  assert.equal(countSyllables("cat"), 1);
  assert.equal(countSyllables("the"), 1);
  assert.equal(countSyllables("a"), 1);
});

test("counts multiple syllables by vowel groups", () => {
  assert.equal(countSyllables("banana"), 3);
  assert.equal(countSyllables("elephant"), 3);
});

test("subtracts a silent trailing e", () => {
  assert.equal(countSyllables("make"), 1);
  assert.equal(countSyllables("time"), 1);
});

test("counts a consonant + le ending as a syllable", () => {
  assert.equal(countSyllables("table"), 2);
  assert.equal(countSyllables("little"), 2);
});

test("never returns fewer than one syllable", () => {
  assert.equal(countSyllables("rhythm"), 1);
  assert.equal(countSyllables("shh"), 1);
});

test("returns 0 for empty or non-letter input", () => {
  assert.equal(countSyllables(""), 0);
  assert.equal(countSyllables("123"), 0);
});
