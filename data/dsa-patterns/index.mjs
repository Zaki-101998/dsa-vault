// @ts-check
// The DSA pattern catalog — the second way to browse Striver's A2Z sheet.
//
// Striver's tree groups problems by where they sit in his course, not by the
// technique they are about: Graphs -> "Hard Problems II" is five Disjoint Set
// Union problems and says so nowhere, while Stack -> "FAQs" mixes monotonic
// stacks with LRU-cache design. This catalog names the technique, gives it one
// screen to revise from, and says which problems belong to it.
//
//   FAMILIES   top level of Patterns view, displayed in THIS ARRAY'S ORDER.
//              There is no `order` field on purpose — nothing to renumber.
//   PATTERNS   every pattern, flat. `family` points at a FAMILIES id.
//
// Shapes are PatternFamily and PatternDef in lib/types.ts, which is where the
// field-by-field documentation lives. lib/patterns.ts annotates the imports
// with those types, so — thanks to tsconfig's `allowJs` — a missing or
// misspelled field is a `npm run build` failure rather than an empty block on
// the page.
//
// WHY .mjs AND NOT JSON. Each pattern carries up to three multi-line code
// templates. JSON strings cannot hold a literal newline, so every template
// would collapse into one `\n`-escaped line: unwritable, and unreviewable in a
// diff. Backtick templates here are real code. (.ts was no good either: this
// repo is on Node 20, which cannot strip types, so scripts/check-patterns.mjs
// could not import it.)
//
// EVERY FILE IN THIS DIRECTORY STARTS WITH `// @ts-check`. Without it the
// JSDoc @type below is only an assertion and tsc trusts it blindly; with it,
// tsc checks each object literal against PatternDef, so a missing `hook` or a
// `cues` misspelled as `cue` fails `npm run build` by name. Verified: it does.
//
// AUTHORING TRAPS, both inside backtick templates:
//   * a literal backtick must be escaped as \`
//   * `${` is live syntax — escape it as \${ (printf-style examples hit this)
//
// Run `npm run check:patterns` after every edit. It is the only thing enforcing
// that each problem has exactly one home, which the whole tree depends on.

import { PATTERNS as binarySearch } from "./binary-search.mjs";
import { PATTERNS as windows } from "./sliding-window.mjs";
import { PATTERNS as graphsTraversal } from "./graphs-traversal.mjs";
import { PATTERNS as graphsDsu } from "./graphs-dsu.mjs";

/** @type {import("../../lib/types").PatternFamily[]} */
export const FAMILIES = [
  {
    id: "binary-search",
    title: "Binary search",
    note: "Halving a range — whether the range is an array you were given or an answer you invented.",
  },
  {
    id: "windows",
    title: "Windows & two pointers",
    note: "Two indices walking right, with the window's state carried as you go.",
  },
  {
    id: "graph-foundations",
    title: "Graph foundations",
    note: "How a graph is stored, and the two walks everything else is built on.",
  },
  {
    id: "graph-traversal",
    title: "Graph traversal",
    note: "BFS and DFS carrying one extra thing: a visited grid, a colour, an indegree.",
  },
  {
    id: "shortest-paths",
    title: "Shortest paths",
    note: "Which algorithm depends on the weights: unit, non-negative, or negative.",
  },
  {
    id: "graph-connectivity",
    title: "Graph connectivity & structure",
    note: "What is joined to what, what it costs to join it, and what breaks it apart.",
  },
];

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [...binarySearch, ...windows, ...graphsTraversal, ...graphsDsu];