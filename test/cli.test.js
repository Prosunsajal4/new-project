"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const CLI = path.join(__dirname, "..", "bin", "plaincheck.js");

function run(args, input) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      input,
      encoding: "utf8",
    });
    return { code: 0, stdout };
  } catch (err) {
    return {
      code: err.status,
      stdout: `${err.stdout || ""}${err.stderr || ""}`,
    };
  }
}

test("prints a summary for simple text on stdin", () => {
  const { code, stdout } = run(["-"], "The cat sat on the mat.");
  assert.equal(code, 0);
  assert.match(stdout, /Grade level:/);
  assert.match(stdout, /Reading ease:/);
});

test("emits valid JSON with --format json", () => {
  const { code, stdout } = run(["-", "--format", "json"], "Simple words here.");
  assert.equal(code, 0);
  const parsed = JSON.parse(stdout);
  assert.ok(typeof parsed.summary.gradeLevel === "number");
  assert.ok(Array.isArray(parsed.issues));
});

test("passes when grade is under --max-grade", () => {
  const { code, stdout } = run(["-", "--max-grade", "20"], "Easy words here.");
  assert.equal(code, 0);
  assert.match(stdout, /PASS/);
});

test("exits 1 when grade exceeds --max-grade", () => {
  const dense =
    "The aforementioned implementation methodology necessitates considerable " +
    "conceptualization regarding the fundamental characterization of " +
    "extraordinarily multifunctional architectural infrastructure. " +
    "Institutional transformation essentially requires comprehensive coordination.";
  const { code, stdout } = run(["-", "--max-grade", "1"], dense);
  assert.equal(code, 1);
  assert.match(stdout, /FAIL/);
});

test("exits 2 on a missing file", () => {
  const { code } = run(["no-such-file.txt"]);
  assert.equal(code, 2);
});

test("exits 2 on an unknown flag", () => {
  const { code } = run(["--bogus"], "text");
  assert.equal(code, 2);
});

test("--quiet prints only the summary block", () => {
  const { stdout } = run(["-", "--quiet"], "The dog ran.");
  assert.ok(!/Flagged sentences/.test(stdout));
  assert.match(stdout, /Grade level:/);
});
