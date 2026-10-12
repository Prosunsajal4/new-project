#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { analyze, gradeLabel } = require("../src/readability");

const ISSUE_LABELS = {
  "long-sentence": "Long sentence (>25 words)",
  "passive-voice": "Passive voice",
  "complex-words": "Too many complex words",
  hedging: "Hedge words (just, very, simply...)",
};

function usage() {
  return `plaincheck - readability analyzer

Usage:
  plaincheck <file> [--max-grade N] [--format text|json] [--quiet]
  echo "text" | plaincheck -            (read from stdin)

Options:
  --max-grade N   Exit 1 if grade level exceeds N (for CI gates)
  --format F      Output format: text (default) or json
  --quiet         Only print the summary line
  -h, --help      Show this help

Examples:
  plaincheck README.md --max-grade 8
  plaincheck docs/intro.md --format json`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function parseArgs(argv) {
  const opts = { file: null, maxGrade: null, format: "text", quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg === "--quiet") opts.quiet = true;
    else if (arg === "--max-grade") opts.maxGrade = Number(argv[++i]);
    else if (arg === "--format") opts.format = argv[++i];
    else if ((arg === "-" || !arg.startsWith("-")) && !opts.file) opts.file = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (opts.maxGrade != null && Number.isNaN(opts.maxGrade)) {
    throw new Error("--max-grade requires a number");
  }
  if (!["text", "json"].includes(opts.format)) {
    throw new Error("--format must be 'text' or 'json'");
  }
  return opts;
}

function renderText(report, opts) {
  const s = report.summary;
  const lines = [];
  lines.push(`Grade level: ${s.gradeLevel}  (${gradeLabel(s.gradeLevel)})`);
  lines.push(`Reading ease: ${s.readingEase} / 100`);
  lines.push(
    `Words: ${s.words} | Sentences: ${s.sentences} | Avg sentence: ${s.avgSentenceLength} words | Unique: ${s.uniqueWords}`
  );

  if (opts.quiet) return lines.join("\n");

  if (report.issues.length > 0) {
    lines.push("");
    lines.push(`Flagged sentences (${report.issues.length}):`);
    for (const issue of report.issues) {
      const labels = issue.issues.map((i) => ISSUE_LABELS[i]).join(", ");
      const preview =
        issue.text.length > 90 ? issue.text.slice(0, 90) + "..." : issue.text;
      lines.push(`  [${labels}]`);
      lines.push(`    "${preview}"`);
    }
  } else {
    lines.push("");
    lines.push("No issues found. Nice writing!");
  }

  if (opts.maxGrade != null) {
    lines.push("");
    lines.push(
      s.gradeLevel > opts.maxGrade
        ? `FAIL: grade ${s.gradeLevel} exceeds max ${opts.maxGrade}`
        : `PASS: grade ${s.gradeLevel} within max ${opts.maxGrade}`
    );
  }
  return lines.join("\n");
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}\n`);
    console.error(usage());
    process.exit(2);
  }

  if (opts.help) {
    console.log(usage());
    return;
  }
  if (!opts.file) {
    console.error("Error: no input file given (use '-' for stdin)\n");
    console.error(usage());
    process.exit(2);
  }

  let text;
  if (opts.file === "-") {
    text = await readStdin();
  } else {
    const resolved = path.resolve(opts.file);
    if (!fs.existsSync(resolved)) {
      console.error(`Error: file not found: ${opts.file}`);
      process.exit(2);
    }
    text = fs.readFileSync(resolved, "utf8");
  }

  const report = analyze(text);
  console.log(
    opts.format === "json"
      ? JSON.stringify(report, null, 2)
      : renderText(report, opts)
  );

  if (opts.maxGrade != null && report.summary.gradeLevel > opts.maxGrade) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(2);
});
