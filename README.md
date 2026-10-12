# plaincheck

Score any text for plain language. plaincheck computes four standard readability indices, flags the specific sentences that will trip up readers, and can fail your CI build when prose gets too dense.

It is a single dependency-free Node.js CLI (Node 18+). No accounts, no network, no telemetry.

## Why

Dense writing quietly excludes people. Government, health, and product copy are held to plain-language standards, but most teams only check readability by eye. plaincheck turns that into a repeatable gate you can run locally or in CI.

## Install

```bash
npm install -g plaincheck
```

Or run it directly from a clone:

```bash
node bin/plaincheck.js README.md
```

## Usage

```
plaincheck <file> [--max-grade N] [--format text|json] [--quiet]
echo "text" | plaincheck -            (read from stdin)

Options:
  --max-grade N   Exit 1 if grade level exceeds N (for CI gates)
  --format F      Output format: text (default) or json
  --quiet         Only print the summary line
  -h, --help      Show this help
```

### Examples

Check a file and list the hard sentences:

```bash
plaincheck docs/intro.md
```

Enforce a grade-8 ceiling in CI:

```bash
plaincheck README.md --max-grade 8
```

Machine-readable output for a dashboard or editor plugin:

```bash
plaincheck docs/intro.md --format json
```

Pipe from another tool:

```bash
git show HEAD:docs/intro.md | plaincheck - --quiet
```

## What it measures

| Index | What it estimates | Good for |
| --- | --- | --- |
| Flesch-Kincaid grade | US school grade level | General prose |
| Gunning Fog | Years of schooling needed | Technical and business writing |
| Coleman-Liau | Grade from character counts | Language-agnostic check |
| SMOG | Grade from polysyllabic words | Health and safety material |

SMOG needs roughly 30 sentences to be reliable; the report sets `smogReliable: false` below that, so short docs are not over-trustingly scored.

Alongside the scores, each sentence is checked for:

- **long-sentence** — more than 25 words
- **passive-voice** — a form of *to be* plus a past participle
- **complex-words** — more than a third of the words have 3+ syllables or a dense suffix
- **hedging** — filler such as *just*, *very*, *simply*, *basically*

## Using it as a CI gate

The `--max-grade` flag makes plaincheck exit non-zero when the Flesch-Kincaid grade exceeds the limit, so it drops straight into any pipeline.

GitHub Actions:

```yaml
name: plain-language
on: [pull_request]
jobs:
  readability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node bin/plaincheck.js README.md docs/*.md --max-grade 9
```

Pre-commit hook:

```bash
#!/bin/sh
node bin/plaincheck.js "$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$')" --max-grade 9
```

## Programmatic API

```js
const { analyze, gradeLabel } = require("plaincheck/src/readability");

const report = analyze("Your prose goes here.");
console.log(report.summary.gradeLevel);   // e.g. 7.4
console.log(report.summary.consensusGrade);
console.log(report.issues);               // flagged sentences with reasons
console.log(gradeLabel(report.summary.gradeLevel));
```

`analyze()` returns a `summary` block, per-`sentences` data, and the filtered `issues` list. The same code powers the CLI, so behaviour matches exactly.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Passed (or no `--max-grade` gate set) |
| 1 | Grade exceeded `--max-grade` |
| 2 | Usage error, bad flag, or unreadable file |

## Development

```bash
npm test          # runs the node:test suite
npm start -- <file>
```

Tests live in `test/` and use Node's built-in test runner, so there is nothing to install.

## License

MIT
