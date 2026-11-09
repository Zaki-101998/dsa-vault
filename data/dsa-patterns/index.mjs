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
// A wall of "TS1005: ',' expected" from a file in this directory is almost
// always one of those two inside a template — the line number in the FIRST
// error is the offender. Inside the prose fields (hook, cues, recall, traps)
// backticks are ordinary double-quoted text and are the intended way to mark
// inline code: PatternPage renders them as <code>.
//
// Run `npm run check:patterns` after every edit. It is the only thing enforcing
// that each problem has exactly one home, which the whole tree depends on.

import { PATTERNS as foundations } from "./foundations.mjs";
import { PATTERNS as arrays } from "./arrays.mjs";
import { PATTERNS as binarySearch } from "./binary-search.mjs";
import { PATTERNS as recursionBits } from "./recursion-bits.mjs";
import { PATTERNS as linkedList } from "./linked-list.mjs";
import { PATTERNS as trees } from "./trees.mjs";
import { PATTERNS as bstTries } from "./bst-tries.mjs";
import { PATTERNS as dp } from "./dp.mjs";
import { PATTERNS as stacks } from "./stacks.mjs";
import { PATTERNS as heapsGreedy } from "./heaps-greedy.mjs";
import { PATTERNS as windows } from "./sliding-window.mjs";
import { PATTERNS as graphsTraversal } from "./graphs-traversal.mjs";
import { PATTERNS as graphsDsu } from "./graphs-dsu.mjs";

/** @type {import("../../lib/types").PatternFamily[]} */
export const FAMILIES = [
  {
    id: "foundations",
    title: "Foundations",
    note: "Loop control, digits, and the habits that decide whether you solve it at all.",
  },
  {
    id: "sorting",
    title: "Sorting",
    note: "The algorithms themselves, and what the merge step can count on the way past.",
  },
  {
    id: "arrays",
    title: "Arrays & matrices",
    note: "One pass with a few variables, two pointers, or a reversal in the right place.",
  },
  {
    id: "hashing",
    title: "Hashing",
    note: "Memory for time — and prefix sums turning subarrays into lookups.",
  },
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
    id: "recursion",
    title: "Recursion & backtracking",
    note: "Enumerating choices, and undoing each one on the way back out.",
  },
  {
    id: "bits",
    title: "Bit manipulation",
    note: "A few identities, and XOR cancelling what appears twice.",
  },
  {
    id: "strings",
    title: "Strings",
    note: "Index care, and one array — the prefix function — behind every matcher.",
  },
  {
    id: "maths",
    title: "Maths",
    note: "Sieve once, then look up.",
  },
  {
    id: "linked-list",
    title: "Linked lists",
    note: "Relinking nodes without losing the rest, and two pointers doing the measuring.",
  },
  {
    id: "trees",
    title: "Binary trees",
    note: "Traversals, and what each node needs from its children or its ancestors.",
  },
  {
    id: "bst",
    title: "Binary search trees",
    note: "One ordering fact — inorder is sorted — doing most of the work.",
  },
  {
    id: "tries",
    title: "Tries",
    note: "A tree over positions in a string, or over the bits of a number.",
  },
  {
    id: "dp-foundations",
    title: "DP foundations",
    note: "Recursion, memo, table — then one or two indices walking a line or a grid.",
  },
  {
    id: "dp-choices",
    title: "DP on choices",
    note: "Take it or leave it, hold or sell. The state machine is the problem.",
  },
  {
    id: "dp-sequences",
    title: "DP on sequences",
    note: "Chains inside one sequence, and alignment between two.",
  },
  {
    id: "dp-partition",
    title: "Partition DP",
    note: "Intervals, split by asking which element is handled last.",
  },
  {
    id: "stacks",
    title: "Stacks & queues",
    note: "What the most recent thing was, and what the next bigger one is.",
  },
  {
    id: "heaps",
    title: "Heaps",
    note: "Cheap access to the extreme, when a full sort is more than you need.",
  },
  {
    id: "greedy",
    title: "Greedy",
    note: "Sort by the right key and commit. The sort key is the whole problem.",
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
export const PATTERNS = [
  ...foundations,
  ...arrays,
  ...binarySearch,
  ...windows,
  ...recursionBits,
  ...linkedList,
  ...trees,
  ...bstTries,
  ...dp,
  ...stacks,
  ...heapsGreedy,
  ...graphsTraversal,
  ...graphsDsu,
];