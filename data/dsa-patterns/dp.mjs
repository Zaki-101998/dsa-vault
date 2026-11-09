// @ts-check
// Dynamic programming — step 16, the largest step in the sheet at 55 problems.
//
// Striver's own numbering (DP-1 .. DP-55) is a teaching sequence, not a
// taxonomy: "DP on subsequences" holds both 0/1 knapsack and unbounded
// knapsack, which differ by one index in the recurrence and are endlessly
// mixed up. The grouping here is by what the STATE is and what the CHOICE is,
// because that is what you have to reconstruct at a whiteboard.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "dp-intro",
    title: "How to recognise and write a DP",
    family: "dp-foundations",
    aka: ["memoization", "tabulation", "overlapping subproblems", "space optimisation"],
    hook: "Recursion that recomputes the same thing: name the state, memoise, then flip it into a table.",
    cues: [
      "count the ways, or find the best way, and a greedy choice can be shown to fail",
      "the same subproblem is reachable by more than one route — overlapping subproblems",
      "the answer at a position depends only on a few earlier positions",
      "a brute-force recursion is exponential and the input size says it should be polynomial",
    ],
    template: {
      java: `// The three-step route from recursion to an O(1)-space loop. Always go in
// this order — writing the table directly is how recurrences come out wrong.
//
// 1. RECURSION. Name the state and the choices. Nothing else matters yet.
int f(int i, int[] a) {
    if (i == 0) return a[0];        // base case
    if (i < 0) return 0;
    int take = a[i] + f(i - 2, a);  // choice 1
    int skip = f(i - 1, a);         // choice 2
    return Math.max(take, skip);
}

// 2. MEMOISE. One line of change: a cache keyed by the state.
int f(int i, int[] a, int[] memo) {
    if (i == 0) return a[0];
    if (i < 0) return 0;
    if (memo[i] != -1) return memo[i];
    return memo[i] = Math.max(a[i] + f(i - 2, a, memo), f(i - 1, a, memo));
}

// 3. TABULATE. Same recurrence, loop in the order the dependencies allow.
int f(int[] a) {
    int n = a.length;
    int[] dp = new int[n];
    dp[0] = a[0];
    for (int i = 1; i < n; i++) {
        int take = a[i] + (i > 1 ? dp[i - 2] : 0);
        dp[i] = Math.max(take, dp[i - 1]);
    }
    return dp[n - 1];
}

// 4. SPACE-OPTIMISE, only when the recurrence looks back a fixed distance.
// Two variables replace the whole array.
int f(int[] a) {
    int prev2 = 0, prev1 = a[0];
    for (int i = 1; i < a.length; i++) {
        int cur = Math.max(a[i] + prev2, prev1);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}`,
    },
    recall: [
      "write the recursion first, every time: state, choices, base case. The table is a mechanical translation of it",
      "the state is whatever you need to carry to make the next choice — no more, no less. An extra dimension is usually a missing insight",
      "memo and tabulation give the same answers; tabulation avoids stack depth, memoisation avoids thinking about iteration order",
      "tabulation's loop direction is forced by the dependencies: if dp[i] reads dp[i−1], go forwards",
      "space-optimise only after the table works, and only when the look-back distance is fixed",
      "use a sentinel the answer can never take for “not computed” — −1 fails when 0 or negatives are valid answers",
      "to print the choices and not just the score, keep the table and walk it backwards; the space-optimised version cannot reconstruct",
    ],
    complexity: {
      time: "states × work per state",
      space: "the size of the table, often reducible to one or two rows",
      note: "The time bound is the single most useful sanity check: count the distinct states and multiply by the branching.",
    },
    traps: [
      "jumping straight to a table and getting the recurrence subtly wrong",
      "a memo sentinel that collides with a real answer",
      "space-optimising and then being asked to print the actual solution",
      "an off-by-one between 1-indexed table rows and 0-indexed input",
      "recursion depth on n = 10**5 in Python or deep Java stacks",
    ],
    problems: ["step-16-dynamic-programming__dynamic-programming-introduction"],
  },

  {
    id: "dp-1d-linear",
    title: "1-D DP along a line",
    family: "dp-foundations",
    aka: ["climbing stairs", "house robber", "frog jump", "non adjacent", "fibonacci style"],
    hook: "One index of state: the answer here is the best over a few steps back.",
    cues: [
      "you move along an array or a staircase, one position at a time",
      "“cannot pick two adjacent” — the giveaway for the skip-two recurrence",
      "a fixed number of previous positions feed the current one",
      "the circular variant: the first and last are adjacent",
    ],
    template: {
      java: `// Climbing stairs / frog jump: come from one or two back, paying the cost.
int frogJump(int[] height) {
    int prev2 = 0, prev1 = 0;
    for (int i = 1; i < height.length; i++) {
        int one = prev1 + Math.abs(height[i] - height[i - 1]);
        int two = i > 1 ? prev2 + Math.abs(height[i] - height[i - 2]) : Integer.MAX_VALUE;
        int cur = Math.min(one, two);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}

// With K distances, the inner loop replaces the two fixed cases. O(n·k).
//    for (int j = 1; j <= k && i - j >= 0; j++)
//        best = Math.min(best, dp[i - j] + Math.abs(h[i] - h[i - j]));

// Non-adjacent sum / house robber: take it and skip one, or skip it.
int rob(int[] a) {
    int prev2 = 0, prev1 = 0;
    for (int x : a) {
        int cur = Math.max(x + prev2, prev1);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}

// CIRCULAR houses: the first and last are neighbours, so one of them is out.
// Run the line version twice — without the last, and without the first — and
// take the better. There is no cleverer trick.
//    return Math.max(rob(a[0..n-2]), rob(a[1..n-1]));`,
    },
    recall: [
      "two rolling variables beat an array once the look-back is fixed at two",
      "the non-adjacent recurrence is max(a[i] + prev2, prev1) — adding prev1 is the bug",
      "k distances costs O(n·k) and needs the real array, not two variables",
      "circular = two linear runs on n−1 elements each; do not try to patch one pass",
      "guard the i > 1 case before reading prev2, or use a sentinel that loses the min/max",
      "for a minimum, the unreachable sentinel must be large; for a maximum, it must be 0 or very negative — mixing these up silently wins the comparison",
    ],
    complexity: {
      time: "O(n), or O(n · k) with k distances",
      space: "O(1), or O(n) when k distances need the table",
    },
    traps: [
      "updating prev2 and prev1 in the wrong order and losing a value",
      "on the circular variant, running one pass and special-casing the ends",
      "n = 1 on the circular version, where both slices are empty",
      "Integer.MAX_VALUE as a minimum sentinel, then adding to it and overflowing",
    ],
    problems: [
      "step-16-dynamic-programming__climbing-stars",
      "step-16-dynamic-programming__frog-jump-dp-3",
      "step-16-dynamic-programming__frog-jump-with-k-distances-dp-4",
      "step-16-dynamic-programming__maximum-sum-of-non-adjacent-elements-dp-5",
      "step-16-dynamic-programming__house-robber-dp-6",
    ],
  },

  {
    id: "dp-grid-paths",
    title: "DP on a grid",
    family: "dp-foundations",
    aka: ["unique paths", "minimum path sum", "triangle", "falling path", "ninja training", "cherry pickup"],
    hook: "Two indices of state, and each cell reads the two or three cells it can be reached from.",
    cues: [
      "a grid or triangle, moving only down / right / diagonally",
      "count the paths, or find the cheapest one",
      "“no two days the same activity” — a position plus a last-choice dimension",
      "two agents moving in step, which is one more dimension rather than two separate DPs",
    ],
    template: {
      java: `// Minimum path sum: each cell takes the cheaper of above and left.
int minPathSum(int[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    int[] dp = new int[cols];                  // one row, rolled forwards
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (r == 0 && c == 0) dp[c] = grid[0][0];
            else {
                int up   = r > 0 ? dp[c]     : Integer.MAX_VALUE;
                int left = c > 0 ? dp[c - 1] : Integer.MAX_VALUE;
                dp[c] = grid[r][c] + Math.min(up, left);
            }
        }
    }
    return dp[cols - 1];
}
// dp[c] still holds the PREVIOUS row when read, and the current row after
// writing — that is the whole trick of the one-row rollup, and why the two
// reads must happen before the write.

// Unique paths: the same loop with + instead of min, starting from 1.
// An obstacle sets the cell to 0. Pure combinatorics also works for the
// unobstructed case: C(m+n-2, m-1).

// TRIANGLE / FALLING PATH: variable row width and three predecessors
// (left-diagonal, straight down, right-diagonal). Going bottom-up removes the
// need to special-case the apex.

// NINJA'S TRAINING: state is (day, lastActivity) — 3 extra values per day,
// and the choice excludes lastActivity.

// CHERRY PICKUP II: two robots move down in lockstep, so the state is
// (row, colA, colB) and each step branches 3 x 3 = 9 ways. One DP over the
// pair, not two DPs — they interact when they land on the same cell.`,
    },
    recall: [
      "state is (row, col); the choice is which neighbour you came from",
      "the one-row rollup works because dp[c] holds the previous row until you overwrite it — so read up and left before writing",
      "counting uses + and starts at 1; optimising uses min/max and starts at the cell's own cost",
      "an obstacle is a 0 when counting and an infinity when minimising",
      "a triangle is easier bottom-up: every cell has both children in range",
      "“no repeat of the last choice” adds a small dimension; it does not need a new technique",
      "two agents in lockstep is one DP over the pair — if they move independently you have missed an interaction",
    ],
    complexity: {
      time: "O(rows · cols), or O(rows · cols² ) for two agents",
      space: "O(cols) with the rollup",
      note: "Cherry Pickup II is O(rows · cols² · 9) states-by-work, which is why the lockstep framing matters.",
    },
    traps: [
      "overwriting dp[c] before reading it as the previous row's value",
      "using MAX_VALUE as the unreachable sentinel and then adding the cell cost, overflowing",
      "counting paths with min/max, or optimising with +",
      "forgetting the start cell may itself be an obstacle",
      "treating two agents as two independent DPs",
    ],
    problems: [
      "step-16-dynamic-programming__ninja-s-training-dp-7",
      "step-16-dynamic-programming__grid-unique-paths-dp-on-grids-dp8",
      "step-16-dynamic-programming__grid-unique-paths-2-dp-9",
      "step-16-dynamic-programming__minimum-path-sum-in-grid-dp-10",
      "step-16-dynamic-programming__minimum-path-sum-in-triangular-grid-dp-11",
      "step-16-dynamic-programming__minimum-maximum-falling-path-sum-dp-12",
      "cherry-pickup-ii",
    ],
  },

  {
    id: "dp-knapsack",
    title: "Knapsack — pick or don't pick",
    family: "dp-choices",
    aka: ["0/1 knapsack", "unbounded knapsack", "subset sum", "coin change", "partition", "target sum", "rod cutting"],
    hook: "State is (index, capacity left); the choice is take this item or skip it. One index decides whether you may take it again.",
    cues: [
      "a subset whose sum must hit, or stay under, some target",
      "“can it be split into two equal halves”, “count the subsets summing to K”",
      "coins or rods you may reuse without limit — that is the unbounded variant",
      "whole items, not fractions. Fractions would make it greedy",
      "the capacity is a number small enough to be an array index",
    ],
    template: {
      java: `// 0/1 KNAPSACK: each item once. On taking an item, move to i-1.
int knapsack01(int[] weight, int[] value, int cap) {
    int[] dp = new int[cap + 1];
    for (int i = 0; i < weight.length; i++) {
        // BACKWARDS, so dp[] still holds the row for items before i —
        // which is what stops the item being reused.
        for (int c = cap; c >= weight[i]; c--) {
            dp[c] = Math.max(dp[c], value[i] + dp[c - weight[i]]);
        }
    }
    return dp[cap];
}

// UNBOUNDED KNAPSACK / coin change: reuse allowed. On taking, stay at i.
// The ONLY difference in the rolled version is the loop direction.
int knapsackUnbounded(int[] weight, int[] value, int cap) {
    int[] dp = new int[cap + 1];
    for (int i = 0; i < weight.length; i++) {
        for (int c = weight[i]; c <= cap; c++) {   // FORWARDS: reuse intended
            dp[c] = Math.max(dp[c], value[i] + dp[c - weight[i]]);
        }
    }
    return dp[cap];
}

// SUBSET SUM (boolean): dp[c] |= dp[c - a[i]], backwards.
// COUNT subsets with sum K: dp[c] += dp[c - a[i]], backwards. Watch zeros —
//   a 0 in the input doubles every count, so the base case is dp[0] = 1 and
//   zeros must be handled deliberately.
// MINIMUM COINS: dp[c] = min(dp[c], 1 + dp[c - coin]), forwards, with
//   dp[0] = 0 and the rest a large sentinel.
// COIN CHANGE II (count combinations, not permutations): coins in the OUTER
//   loop, amount inner. Swapping the loops counts orderings instead.
// MINIMUM SUBSET DIFFERENCE: find every reachable subset sum s up to total/2;
//   the answer is min over reachable s of total - 2s.
// TARGET SUM / count partitions with difference d: assigning +/- signs means
//   one side sums to (total + d) / 2 — reject it if that is odd or negative,
//   then it is just "count subsets with sum K".
// ROD CUTTING: unbounded knapsack where a piece of length i has weight i.`,
    },
    recall: [
      "0/1 loops capacity BACKWARDS, unbounded loops FORWARDS. That one line is the whole distinction",
      "recursion form: 0/1 takes f(i−1, c−w), unbounded takes f(i, c−w)",
      "whole items means DP; fractions mean greedy. Check which you were given",
      "count combinations with coins outer / amount inner; the other order counts permutations",
      "target sum and count-partitions-with-difference both reduce to subset-sum-equals-K via (total ± d) / 2, and both need the parity and sign checks",
      "minimum subset difference reads off the reachable-sums table; it needs no separate DP",
      "for counting, the base case is dp[0] = 1; for minimising, dp[0] = 0 and the rest a sentinel",
      "zeros in the input break naive subset counting — reason about them explicitly",
    ],
    complexity: {
      time: "O(n · capacity)",
      space: "O(capacity) rolled",
      note: "Pseudo-polynomial: it is linear in the capacity's VALUE, not in its number of digits, which is why a 10⁹ target rules it out.",
    },
    traps: [
      "looping capacity forwards on 0/1, which silently allows reuse",
      "looping backwards on unbounded, which forbids it",
      "swapping the loop order on coin change II and counting permutations",
      "forgetting the parity/negative check when deriving the target from (total + d) / 2",
      "sentinel overflow on 1 + dp[c − coin] when dp[c − coin] is MAX_VALUE",
      "mishandling zeros when counting subsets",
    ],
    problems: [
      "0-and-1-knapsack",
      "step-16-dynamic-programming__subset-sum-equal-to-target-dp-14",
      "step-16-dynamic-programming__partition-equal-subset-sum-dp-15",
      "partition-a-set-into-two-subsets-with-minimum-absolute-sum-difference",
      "step-16-dynamic-programming__count-subsets-with-sum-k-dp-17",
      "step-16-dynamic-programming__count-partitions-with-given-difference-dp-18",
      "step-16-dynamic-programming__target-sum-dp-21",
      "step-16-dynamic-programming__unbounded-knapsack-dp-23",
      "step-16-dynamic-programming__minimum-coins-dp-20",
      "step-16-dynamic-programming__coin-change-2-dp-22",
      "step-16-dynamic-programming__rod-cutting-problem-dp-24",
    ],
    borrows: [
      "step-07-recursion__count-all-subsequences-with-sum-k",
      "step-07-recursion__check-if-there-exists-a-subsequence-with-sum-k",
    ],
  },

  {
    id: "dp-stocks",
    title: "DP on stocks — state machines",
    family: "dp-choices",
    aka: ["best time to buy and sell stock", "transaction fee", "at most k transactions", "holding state"],
    hook: "State is (day, holding or not, transactions left); the choice each day is buy, sell, or do nothing.",
    cues: [
      "prices by day, and profit from buying before selling",
      "a cap on the number of transactions, or a fee per trade",
      "a cooldown after selling",
      "the one-transaction case, which is not DP at all — just track the running minimum",
    ],
    template: {
      java: `// ONE transaction: no DP needed. Track the cheapest day so far.
int maxProfitOnce(int[] price) {
    int cheapest = Integer.MAX_VALUE, best = 0;
    for (int p : price) {
        cheapest = Math.min(cheapest, p);
        best = Math.max(best, p - cheapest);
    }
    return best;
}

// UNLIMITED transactions: two states, holding or not. Every day, either stay
// or switch. This is the shape that generalises to all the variants.
int maxProfitUnlimited(int[] price) {
    int notHolding = 0, holding = Integer.MIN_VALUE / 2;   // /2 avoids overflow
    for (int p : price) {
        int prevNot = notHolding;
        notHolding = Math.max(notHolding, holding + p);    // sell today
        holding    = Math.max(holding, prevNot - p);       // buy today
    }
    return notHolding;                                     // never end holding
}
// Using the UPDATED notHolding to compute holding would let you buy and sell
// on the same day — hence prevNot.

// TRANSACTION FEE: pay it on one side only, e.g. notHolding = max(notHolding,
//   holding + p - fee).
// AT MOST K transactions: add a dimension. dp[t][holding], looping t from 1..k.
//   "At most 2" is just k = 2 — do not write it as a separate four-variable
//   special case unless you are confident.
// COOLDOWN after selling: a third state, "just sold", which cannot buy today.`,
    },
    recall: [
      "the state machine is the pattern: enumerate the states, then write what each day can do from each",
      "one transaction is not DP — running minimum and running best",
      "compute the new holding from the PREVIOUS notHolding, or you buy and sell the same day",
      "the fee goes on one side only; charging it on both halves the profit",
      "at most k is one extra dimension, O(n · k); at most 2 is the k = 2 case",
      "the answer is always the not-holding state at the end — holding a share is never better",
      "initialise holding to a large negative, but not MIN_VALUE: it gets added to and overflows",
    ],
    complexity: {
      time: "O(n), or O(n · k) with a transaction cap",
      space: "O(1), or O(k)",
    },
    traps: [
      "using the freshly updated notHolding when computing holding",
      "Integer.MIN_VALUE as the initial holding value, which overflows on the first add",
      "charging the fee on both buy and sell",
      "returning the holding state at the end",
      "hand-rolling a four-variable “at most 2” and losing track of which is which",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__stock-buy-and-sell",
      "step-16-dynamic-programming__best-time-to-buy-and-sell-stock-dp-35",
      "step-16-dynamic-programming__buy-and-sell-stock-ii-dp-36",
      "step-16-dynamic-programming__buy-and-sell-stocks-iii-dp-37",
      "step-16-dynamic-programming__buy-and-stock-sell-iv-dp-38",
      "step-16-dynamic-programming__buy-and-sell-stocks-with-transaction-fee-dp-40",
    ],
  },

  {
    id: "dp-lis",
    title: "Longest increasing subsequence",
    family: "dp-sequences",
    aka: ["LIS", "largest divisible subset", "longest string chain", "bitonic", "patience sorting"],
    hook: "dp[i] is the best chain ending exactly at i; look back at every j that can precede it.",
    cues: [
      "the longest subsequence that is increasing, divisible, chainable, bitonic",
      "elements that can follow each other under some pairwise rule",
      "“print the actual subsequence”, not just its length",
      "O(n log n) demanded, which rules out the look-back loop",
    ],
    template: {
      java: `// O(n²): dp[i] = the longest chain ending at i. The outer index is the end,
// the inner index is every candidate predecessor.
int lis(int[] a) {
    int n = a.length;
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    int best = 1;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        best = Math.max(best, dp[i]);
    }
    return best;
}
// To PRINT it, also keep parent[i] = j whenever dp[i] improves, remember the
// index where the best value was achieved, and walk the parents backwards.

// O(n log n) by patience sorting: tails[k] is the smallest possible tail of an
// increasing subsequence of length k+1. Binary search for where each value
// goes. tails is NOT the LIS itself — only its length is meaningful.
int lisFast(int[] a) {
    List<Integer> tails = new ArrayList<>();
    for (int x : a) {
        int at = Collections.binarySearch(tails, x);
        if (at < 0) at = -(at + 1);              // lower bound
        if (at == tails.size()) tails.add(x);
        else tails.set(at, x);                   // a smaller tail is better
    }
    return tails.size();
}

// LARGEST DIVISIBLE SUBSET: sort first, then the rule is a[i] % a[j] == 0.
// LONGEST STRING CHAIN: sort by length, and the rule is "j is a subsequence of
//   i with one character removed".
// BITONIC: run LIS forwards and backwards; the answer at i is
//   up[i] + down[i] - 1, since i is counted in both.
// NUMBER OF LIS: carry a count[] beside dp[]. On a strictly better chain,
//   copy the count; on an equal-length one, add it.`,
    },
    recall: [
      "dp[i] is the best chain ending AT i, not within the first i — the distinction is everything",
      "the answer is max over dp[], not dp[n−1]",
      "any pairwise rule works in place of <, but sort first whenever the rule needs an order (divisibility, string length)",
      "the O(n log n) tails array gives the right length but is not a valid subsequence; to print one, use the O(n²) version with parents",
      "bitonic adds the two directions and subtracts 1 for the double-counted peak",
      "counting LIS needs count[]: copy on strictly better, add on equal",
      "strictly increasing uses lower bound in the fast version; non-decreasing uses upper bound",
    ],
    complexity: {
      time: "O(n²), or O(n log n) with patience sorting",
      space: "O(n)",
    },
    traps: [
      "returning dp[n−1] instead of the maximum over dp",
      "forgetting to sort before a divisibility or string-chain rule",
      "trying to read the subsequence out of the tails array",
      "double-counting the peak in the bitonic sum",
      "lower versus upper bound when ties are allowed",
    ],
    problems: [
      "step-16-dynamic-programming__longest-increasing-subsequence-dp-41",
      "step-16-dynamic-programming__printing-longest-increasing-subsequence-dp-42",
      "step-16-dynamic-programming__longest-increasing-subsequence-dp-43",
      "print-longest-increasing-subsequence",
      "step-16-dynamic-programming__largest-divisible-subset-dp-44",
      "step-16-dynamic-programming__longest-string-chain-dp-45",
      "step-16-dynamic-programming__longest-bitonic-subsequence-dp-46",
      "step-16-dynamic-programming__number-of-longest-increasing-subsequences-dp-47",
    ],
  },

  {
    id: "dp-strings",
    title: "DP on two strings",
    family: "dp-sequences",
    aka: ["LCS", "edit distance", "longest common substring", "wildcard matching", "distinct subsequences", "supersequence"],
    hook: "State is (i, j) — how much of each string is used. Characters match, or you drop one from one side.",
    cues: [
      "two strings and a similarity, a distance, or a shared part",
      "one string and a palindrome question — the second string is its own reverse",
      "insertions, deletions and replacements to turn A into B",
      "a pattern with wildcards to match against a text",
    ],
    template: {
      java: `// LCS is the parent of everything here. 1-indexed rows so row 0 and column 0
// are the "empty prefix" base cases and need no special-casing.
int lcs(String a, String b) {
    int n = a.length(), m = b.length();
    int[][] dp = new int[n + 1][m + 1];
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = 1 + dp[i - 1][j - 1];     // match: consume both
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);   // drop one
            }
        }
    }
    return dp[n][m];
}
// PRINT the LCS by walking back from dp[n][m]: on a match take the character
// and step diagonally, otherwise step towards the larger neighbour.

// EDIT DISTANCE: three choices on a mismatch, all costing 1.
//   dp[i][j] = 1 + min(dp[i-1][j]   delete from a,
//                      dp[i][j-1]   insert into a,
//                      dp[i-1][j-1] replace)
//   Base cases are NOT zero: dp[i][0] = i and dp[0][j] = j.

// LONGEST COMMON SUBSTRING: contiguous, so a mismatch resets to 0 rather than
//   carrying a max across, and the answer is the max over the whole table.

// Reductions worth memorising, all on top of LCS:
//   longest palindromic subsequence  = lcs(s, reverse(s))
//   min insertions to make palindrome = n - lps(s)
//   min insertions + deletions A -> B = (n - lcs) + (m - lcs)
//   shortest common supersequence len = n + m - lcs

// DISTINCT SUBSEQUENCES (count a in b): on a match you may use it or not, so
//   dp[i][j] = dp[i-1][j-1] + dp[i-1][j]; on a mismatch only dp[i-1][j].

// WILDCARD MATCHING: '?' is one character, '*' is any run.
//   '*' -> dp[i][j] = dp[i-1][j]    (star absorbs a[i])
//                  || dp[i][j-1]    (star matches empty)
//   The base row needs dp[0][j] true only while the pattern is all stars.`,
    },
    recall: [
      "1-indexed table, 0-indexed strings: charAt(i−1). Nearly every bug here is this off-by-one",
      "match means consume both and step diagonally; mismatch means drop one and take the better",
      "subsequence carries the max across a mismatch; SUBSTRING resets to 0 and the answer is the table's maximum",
      "edit distance's base row and column are i and j, not 0 — an empty string needs that many inserts",
      "palindrome questions become LCS against the reversed string",
      "min insertions to make a palindrome = n − longest palindromic subsequence",
      "shortest common supersequence = n + m − LCS",
      "counting variants use + where optimising variants use max",
      "printing needs the full table; the two-row rollup cannot reconstruct",
    ],
    complexity: {
      time: "O(n · m)",
      space: "O(n · m), or O(m) with two rows when you do not need to print",
    },
    traps: [
      "charAt(i) instead of charAt(i−1) with a 1-indexed table",
      "treating longest common substring like a subsequence and carrying the max through a mismatch",
      "zero base cases on edit distance",
      "space-optimising and then being asked for the actual string",
      "in wildcard matching, getting the first row wrong so a leading star fails",
      "counting overflow in distinct subsequences — use long or the stated modulus",
    ],
    problems: [
      "step-16-dynamic-programming__longest-common-subsequence-dp-25",
      "step-16-dynamic-programming__print-longest-common-subsequence-dp-26",
      "step-16-dynamic-programming__longest-common-substring-dp-27",
      "step-16-dynamic-programming__longest-palindromic-subsequence-dp-28",
      "step-16-dynamic-programming__minimum-insertions-to-make-string-palindrome-dp-29",
      "step-16-dynamic-programming__minimum-insertions-deletions-to-convert-string-dp-30",
      "step-16-dynamic-programming__shortest-common-supersequence-dp-31",
      "step-16-dynamic-programming__distinct-subsequences-dp-32",
      "step-16-dynamic-programming__edit-distance-dp-33",
      "step-16-dynamic-programming__wildcard-matching-dp-34",
    ],
  },

  {
    id: "dp-partition",
    title: "Partition DP — try every split",
    family: "dp-partition",
    aka: ["MCM", "matrix chain multiplication", "burst balloons", "palindrome partitioning II", "interval DP", "cut the stick"],
    hook: "State is an interval; the choice is which element inside it you handle LAST.",
    cues: [
      "a sequence to be cut, bracketed or combined, and the order of operations changes the cost",
      "matrix chains, burst balloons, cutting a stick, evaluating an expression",
      "you tried “which do I do FIRST” and the two halves refused to be independent",
      "partitioning a string into pieces that each satisfy something",
    ],
    template: {
      java: `// MCM: f(i, j) is the best cost for the chain from i to j. Try every k as the
// LAST multiplication, which splits the chain into two independent halves.
int mcm(int[] dim) {               // matrix p is dim[p-1] x dim[p]
    int n = dim.length;
    int[][] dp = new int[n][n];
    // Interval length ascending, so both halves are already solved.
    for (int i = n - 1; i >= 1; i--) {
        for (int j = i + 1; j < n; j++) {
            int best = Integer.MAX_VALUE;
            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k + 1][j]
                         + dim[i - 1] * dim[k] * dim[j];
                best = Math.min(best, cost);
            }
            dp[i][j] = best;
        }
    }
    return dp[1][n - 1];
}

// BURST BALLOONS is the one that teaches the pattern. "Which do I burst
// first?" fails, because bursting changes both neighbours. "Which do I burst
// LAST?" works: when k is last, its neighbours are the untouched boundaries
// i-1 and j+1, so the halves are independent. Pad the array with 1 at both
// ends and iterate interval lengths.
//    dp[i][j] = max over k in [i..j] of
//               dp[i][k-1] + a[i-1]*a[k]*a[j+1] + dp[k+1][j]

// MINIMUM COST TO CUT A STICK: sort the cut positions, add 0 and L as
// sentinels, then it is MCM over the cut array.

// PALINDROME PARTITIONING II (front partition, the simpler cousin): one index
// of state, cutting at every valid prefix.
//    dp[i] = min over j >= i where s[i..j] is a palindrome of 1 + dp[j+1]
// Precompute the palindrome table, or it is O(n³).

// PARTITION ARRAY FOR MAXIMUM SUM: the same front partition with a window
// capped at k, carrying the running maximum of the current piece.

// BOOLEAN EXPRESSION EVALUATION: interval DP with an extra dimension for the
// wanted result (true or false), splitting at each operator.`,
    },
    recall: [
      "ask which element is handled LAST, not first — that is what makes the two halves independent",
      "iterate by increasing interval length (or i descending and j ascending), so sub-intervals are ready",
      "burst balloons pads with 1 at both ends; the k-is-last framing is the entire insight",
      "front partition (one index) is the easier family: palindrome partitioning II and partition-for-maximum-sum",
      "precompute the palindrome table, or the triple loop becomes O(n³) with an O(n) check inside",
      "an extra dimension appears when the *result* matters, as in boolean expression evaluation",
      "answer location differs: MCM reads dp[1][n−1], front partition reads dp[0]",
    ],
    complexity: {
      time: "O(n³) for interval DP, O(n²) for a front partition",
      space: "O(n²), or O(n) for a front partition",
      note: "n³ at n = 500 is 1.25 × 10⁸ — fine in Java or C++, usually too slow in Python.",
    },
    traps: [
      "splitting on “which first”, so the halves are not independent",
      "iterating i and j in the wrong order, reading sub-intervals not yet computed",
      "forgetting the sentinel padding on burst balloons and cut-the-stick",
      "an O(n) palindrome check inside the loops instead of a precomputed table",
      "the dimension indexing in MCM: matrix p is dim[p−1] × dim[p], and dp is indexed from 1",
    ],
    problems: [
      "step-16-dynamic-programming__matrix-chain-multiplication-dp-48",
      "step-16-dynamic-programming__matrix-chain-multiplication-bottom-up-dp-49",
      "step-16-dynamic-programming__minimum-cost-to-cut-the-stick-dp-50",
      "step-16-dynamic-programming__burst-balloons-dp-51",
      "step-16-dynamic-programming__palindrome-partitioning-ii-dp-53",
      "step-16-dynamic-programming__partition-array-for-maximum-sum-dp-54",
      "different-ways-to-evaluate-a-boolean-expression",
    ],
    borrows: [
      "step-07-recursion__palindrome-partitioning",
    ],
  },
];
