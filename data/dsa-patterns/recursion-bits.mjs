// @ts-check
// Recursion and backtracking (step 6), bit manipulation (step 8), advanced
// strings (step 18) and maths (step 19).
//
// "Maximum Sum Combination" sits in Striver's Recursion step but is a top-k
// heap problem, so it lives in ./heaps-greedy.mjs under that pattern. And the
// five "Advanced Problems (Less asked)" strings are all one idea — the prefix
// function — which the section title hides completely.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "recursion-fundamentals",
    title: "Recursion where recursion is the point",
    family: "recursion",
    aka: ["binary exponentiation", "fast power", "pow x n", "recursive atoi", "divide and conquer"],
    hook: "Halve the problem rather than stepping through it, and the depth is log n instead of n.",
    cues: [
      "x to the power n, with n up to 10**9",
      "parse a string recursively, one character at a time",
      "an O(n) loop where the structure allows halving",
      "modular exponentiation, which is the same loop with a modulus",
    ],
    template: {
      java: `// BINARY EXPONENTIATION: x^n = (x^(n/2))² , times x once more if n is odd.
double power(double x, long n) {
    if (n < 0) { x = 1 / x; n = -n; }        // careful: -Integer.MIN_VALUE
    double result = 1;
    while (n > 0) {
        if ((n & 1) == 1) result *= x;        // odd: take one factor out
        x *= x;
        n >>= 1;
    }
    return result;
}
// Recursive form, same idea:
//   if (n == 0) return 1;
//   double half = power(x, n / 2);
//   return n % 2 == 0 ? half * half : half * half * x;

// MODULAR version — the one that actually comes up. Multiply in long.
long powMod(long x, long n, long mod) {
    long result = 1;
    x %= mod;
    while (n > 0) {
        if ((n & 1) == 1) result = result * x % mod;
        x = x * x % mod;
        n >>= 1;
    }
    return result;
}

// RECURSIVE atoi: consume one character per call, carrying the value so far.
// The real work is the edge cases, not the recursion: leading whitespace, an
// optional sign, non-digits terminating the parse, and clamping on overflow.
int atoi(String s, int i, long value, int sign) {
    if (i == s.length() || !Character.isDigit(s.charAt(i))) return (int) (sign * value);
    value = value * 10 + (s.charAt(i) - '0');
    if (value > Integer.MAX_VALUE) {
        return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;   // clamp
    }
    return atoi(s, i + 1, value, sign);
}`,
    },
    recall: [
      "n & 1 for odd, n >>= 1 to halve — the iterative form has no stack and is the one to write",
      "a negative exponent inverts the base; n = Integer.MIN_VALUE cannot be negated in an int, so widen to long first",
      "the modular version multiplies in long and reduces after every step",
      "atoi's difficulty is entirely in the edge cases: whitespace, sign, non-digits, overflow clamping",
      "accumulate into a long and clamp, rather than trying to detect int overflow after the fact",
      "log n depth, so n = 10⁹ is about 30 steps",
    ],
    complexity: { time: "O(log n)", space: "O(1) iterative, O(log n) recursive" },
    traps: [
      "negating Integer.MIN_VALUE, which stays negative",
      "squaring without the modulus and overflowing before reducing",
      "forgetting that x^0 is 1, including for x = 0 by convention in these problems",
      "in atoi, not clamping and silently wrapping around",
    ],
    problems: [
      "step-07-recursion__pow-x-n",
      "step-08-bit-manipulation__power-n-x",
      "step-07-recursion__recursive-implementation-of-atoi",
    ],
    borrows: [
      "step-08-bit-manipulation__divide-two-integers-without-using-multiplication-division-and-mod-operator",
    ],
  },

  {
    id: "pick-not-pick",
    title: "Pick or don't pick — enumerating subsequences",
    family: "recursion",
    aka: ["power set", "subsets", "subsequence with sum k", "take not take", "include exclude"],
    hook: "At every index, branch twice: take this element, or skip it.",
    cues: [
      "generate every subset, subsequence or power set",
      "“does any subsequence sum to K”, or how many do",
      "2^n possibilities, with n small enough (about 20) to enumerate",
      "the recursion tree is a binary tree of depth n",
    ],
    template: {
      java: `// The template. Two calls, and the add/remove around the first is the
// backtracking — without the remove, the list leaks into the skip branch.
void subsets(int i, int[] a, List<Integer> cur, List<List<Integer>> out) {
    if (i == a.length) {
        out.add(new ArrayList<>(cur));      // a COPY — cur keeps mutating
        return;
    }
    cur.add(a[i]);                          // PICK
    subsets(i + 1, a, cur, out);
    cur.remove(cur.size() - 1);             // undo

    subsets(i + 1, a, cur, out);            // NOT PICK
}

// COUNT subsequences with sum k: return counts instead of collecting.
int count(int i, int[] a, int target) {
    if (target == 0) return 1;
    if (i == a.length || target < 0) return 0;
    return count(i + 1, a, target - a[i])   // pick
         + count(i + 1, a, target);         // skip
}
// EXISTS is the same with || instead of +, which short-circuits — and is why
// the "check if there exists" version can be much faster in practice.

// Note what happens when the target becomes 0: this is exactly the knapsack
// recursion from the DP family. Memoise it and it is "count subsets with sum
// K" in O(n · target). Enumerating is only right when n is small or every
// subsequence must actually be printed.`,
    },
    recall: [
      "add, recurse, remove, then recurse again — the remove is what separates the two branches",
      "store a COPY when you reach the base case; the working list keeps changing",
      "2^n, so n above roughly 22 is out of reach — check the constraint before writing this",
      "if the problem only wants a count or a yes/no, this recursion is the knapsack DP and should be memoised instead",
      "`exists` short-circuits with ||; `count` cannot",
      "the base case is i == n, and the target check comes before it only if negatives can be skipped early",
    ],
    complexity: {
      time: "O(2^n), times O(n) if each subset is copied out",
      space: "O(n) recursion depth, plus the output",
    },
    traps: [
      "adding the live list to the output rather than a copy",
      "forgetting the remove, so the skip branch inherits the picked element",
      "enumerating when a memoised count would do, and timing out",
      "an early return on target < 0 when the input can contain negatives",
    ],
    problems: [
      "step-08-bit-manipulation__power-set",
      "subsets-i",
      "step-07-recursion__check-if-there-exists-a-subsequence-with-sum-k",
      "step-07-recursion__count-all-subsequences-with-sum-k",
    ],
    borrows: [
      "step-16-dynamic-programming__subset-sum-equal-to-target-dp-14",
    ],
  },

  {
    id: "combination-backtracking",
    title: "Combinations, with duplicates handled",
    family: "recursion",
    aka: ["combination sum", "combination sum II", "combination sum III", "subsets II", "duplicate skip"],
    hook: "Loop over the candidates from a start index, and skip a value equal to the previous one at the same level.",
    cues: [
      "all combinations summing to a target, where an element may or may not repeat",
      "the input has duplicates and the output must not",
      "“each number may be used unlimited times” versus “once” — the recursion differs by one index",
      "a fixed size k as well as a target sum",
    ],
    template: {
      java: `// UNLIMITED reuse: recurse with i, so the same element can be taken again.
void combinationSum(int i, int[] a, int target, List<Integer> cur, List<List<Integer>> out) {
    if (target == 0) { out.add(new ArrayList<>(cur)); return; }
    if (i == a.length || target < 0) return;

    cur.add(a[i]);
    combinationSum(i, a, target - a[i], cur, out);    // i, NOT i + 1
    cur.remove(cur.size() - 1);

    combinationSum(i + 1, a, target, cur, out);
}

// EACH ELEMENT ONCE, with duplicates in the input. Sort first, then use the
// loop form, where the duplicate skip has somewhere natural to live.
void combinationSum2(int start, int[] a, int target, List<Integer> cur, List<List<Integer>> out) {
    if (target == 0) { out.add(new ArrayList<>(cur)); return; }
    for (int i = start; i < a.length; i++) {
        if (i > start && a[i] == a[i - 1]) continue;   // same value, same level
        if (a[i] > target) break;                      // sorted: no point going on
        cur.add(a[i]);
        combinationSum2(i + 1, a, target - a[i], cur, out);
        cur.remove(cur.size() - 1);
    }
}
// The skip condition is i > start, NOT i > 0. At a deeper level the same value
// is legitimately reusable — it is only a duplicate CHOICE AT THE SAME LEVEL
// that must be suppressed. This single comparison is the whole difficulty of
// the family.

// SUBSETS II is the same loop with no target: collect cur at every entry.
// COMBINATION SUM III fixes both the size (k numbers) and the sum, drawing
// from 1..9 with no duplicates, so no skip is needed — only the two bounds.`,
    },
    recall: [
      "unlimited reuse recurses with i; use-once recurses with i + 1",
      "sort the input before any duplicate handling",
      "the skip condition is `i > start && a[i] == a[i-1]` — i > start, never i > 0",
      "on sorted input, `break` when the candidate exceeds the remaining target, rather than `continue`",
      "the loop form and the pick/not-pick form are equivalent, but the loop form is where the duplicate skip fits naturally",
      "two bounds to check when the size is fixed: enough numbers left, and the sum not yet exceeded",
    ],
    complexity: {
      time: "exponential in the worst case; the pruning is what makes it practical",
      space: "O(target / min element) depth for the unlimited version",
    },
    traps: [
      "i > 0 instead of i > start, which wrongly suppresses valid combinations",
      "skipping duplicates without sorting first, so equal values are not adjacent",
      "recursing with i + 1 when reuse is allowed, or with i when it is not",
      "continue where break is correct on sorted input, losing the pruning",
    ],
    problems: [
      "step-07-recursion__combination-sum",
      "step-07-recursion__combination-sum-ii",
      "step-07-recursion__combination-sum-iii",
      "step-07-recursion__subset-sum-ii",
    ],
  },

  {
    id: "generate-strings",
    title: "Generating valid strings",
    family: "recursion",
    aka: ["generate parentheses", "letter combinations", "phone number", "constrained generation"],
    hook: "Build the string one character at a time, and let the constraint prune the branch before it is taken.",
    cues: [
      "generate every valid arrangement of something — brackets, letters, digits",
      "a digit-to-letters mapping, as on a phone keypad",
      "validity can be checked as you build, not only at the end",
      "the output is the list of strings itself, so exponential output is expected",
    ],
    template: {
      java: `// GENERATE PARENTHESES: two counters, two rules, and the rules are what make
// this cheap — invalid prefixes are never built at all.
void generate(int open, int close, int n, StringBuilder sb, List<String> out) {
    if (sb.length() == 2 * n) { out.add(sb.toString()); return; }

    if (open < n) {                        // room for another opener
        sb.append('(');
        generate(open + 1, close, n, sb, out);
        sb.deleteCharAt(sb.length() - 1);
    }
    if (close < open) {                    // only close what is already open
        sb.append(')');
        generate(open, close + 1, n, sb, out);
        sb.deleteCharAt(sb.length() - 1);
    }
}

// LETTER COMBINATIONS: one recursion level per digit, looping its letters.
static final String[] KEYS = { "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz" };

void letters(int i, String digits, StringBuilder sb, List<String> out) {
    if (i == digits.length()) {
        if (sb.length() > 0) out.add(sb.toString());
        return;
    }
    for (char c : KEYS[digits.charAt(i) - '0'].toCharArray()) {
        sb.append(c);
        letters(i + 1, digits, sb, out);
        sb.deleteCharAt(sb.length() - 1);
    }
}`,
    },
    recall: [
      "prune on the way in, not by validating a finished string — `close < open` is the rule that does all the work",
      "a StringBuilder with append/deleteCharAt is the string equivalent of add/remove on a list",
      "one recursion level per position, with a loop over that position's options",
      "the empty input is a real case: an empty digit string should give an empty list, not a list holding an empty string",
      "the count of valid bracket strings is the Catalan number, which is why this is far smaller than 2^(2n)",
    ],
    complexity: {
      time: "O(4^n / sqrt(n)) for parentheses, O(4^n) for n keypad digits",
      space: "O(n) depth plus the output",
    },
    traps: [
      "generating every arrangement and filtering, instead of pruning",
      "`close <= open` rather than `close < open`, producing invalid strings",
      "forgetting to undo the append",
      "returning a list containing one empty string for empty input",
    ],
    problems: [
      "step-07-recursion__generate-paranthesis",
      "step-07-recursion__letter-combinations-of-a-phone-number",
    ],
  },

  {
    id: "backtracking-board",
    title: "Backtracking on a board",
    family: "recursion",
    aka: ["N queens", "sudoku solver", "rat in a maze", "word search", "M coloring", "palindrome partitioning"],
    hook: "Place, recurse, un-place — and make the validity check O(1) so the pruning is worth it.",
    cues: [
      "place pieces on a grid with no two conflicting",
      "fill in a puzzle — Sudoku, graph colouring",
      "find a path through a maze, or a word in a grid of letters",
      "cut a string into pieces that each satisfy something",
      "“find all solutions”, or “is there any solution”",
    ],
    template: {
      java: `// The shape of every one of these: try each option, recurse, undo.
boolean solve(int position) {
    if (position == total) return true;                // a full solution
    for (int option : optionsFor(position)) {
        if (!isValid(position, option)) continue;      // prune
        place(position, option);
        if (solve(position + 1)) return true;          // "any solution"
        unplace(position, option);                     // backtrack
    }
    return false;
}
// For ALL solutions, collect at the base case and never return early.

// N QUEENS: one queen per column, so the only question is which row. Keep
// three boolean arrays so the validity check is O(1) rather than O(n):
//    rows[r], diag1[r + c], diag2[r - c + n - 1]
// Those two diagonal indices are the trick worth memorising.

// SUDOKU: rows[9][9], cols[9][9], boxes[9][9] seen-flags. The box index is
//    (r / 3) * 3 + c / 3
// Recurse cell by cell, skipping the ones already filled.

// WORD SEARCH / RAT IN A MAZE: mark the cell as visited before recursing and
// unmark after. Mutating the grid in place — writing '#' and restoring the
// original character — avoids a separate visited array.
boolean search(char[][] g, String word, int k, int r, int c) {
    if (k == word.length()) return true;
    if (r < 0 || r >= g.length || c < 0 || c >= g[0].length) return false;
    if (g[r][c] != word.charAt(k)) return false;

    char saved = g[r][c];
    g[r][c] = '#';                                     // mark
    for (int[] d : DIRS) {
        if (search(g, word, k + 1, r + d[0], c + d[1])) { g[r][c] = saved; return true; }
    }
    g[r][c] = saved;                                   // restore
    return false;
}

// M COLORING: colour the vertices one at a time, checking only the already
// coloured neighbours.
// PALINDROME PARTITIONING: cut after every index whose prefix is a palindrome;
// precompute the palindrome table so the check is O(1).`,
    },
    recall: [
      "place, recurse, un-place — and the un-place must happen on every exit path from the loop body",
      "an O(1) validity check is what makes backtracking viable; an O(n) check inside the loop usually is not",
      "N queens: rows[], diag1 indexed r + c, diag2 indexed r − c + n − 1",
      "Sudoku's box index is (r / 3) * 3 + c / 3",
      "marking the grid in place and restoring it beats allocating a visited array per call",
      "“any solution” returns early up the stack; “all solutions” must never return early",
      "the order you try options in can change the running time enormously, even though it cannot change correctness",
    ],
    complexity: {
      time: "exponential; the pruning determines whether it finishes",
      space: "O(depth) plus whatever the validity check stores",
    },
    traps: [
      "forgetting to undo on one of the exit paths, leaving the board dirty",
      "an O(n) scan for validity where three boolean arrays give O(1)",
      "the diagonal index arithmetic in N queens, especially the r − c offset",
      "returning early when all solutions are wanted",
      "restoring the cell before the recursive call rather than after",
    ],
    problems: [
      "step-07-recursion__n-queen",
      "step-07-recursion__rat-in-a-maze",
      "step-07-recursion__word-search",
      "step-07-recursion__m-coloring-problem",
      "step-07-recursion__sudoko-solver",
      "step-07-recursion__palindrome-partitioning",
    ],
  },

  {
    id: "bit-tricks",
    title: "Bit tricks",
    family: "bits",
    aka: ["bit manipulation", "set bit", "clear bit", "n & (n-1)", "divide without division", "lowest set bit"],
    hook: "A handful of identities: `n & (n-1)` clears the lowest set bit, `n & -n` isolates it.",
    cues: [
      "check, set, clear or toggle a particular bit",
      "count the set bits, or the flips between two numbers",
      "divide or multiply without the operators",
      "powers of two, or “is exactly one bit set”",
    ],
    template: {
      java: `// The identities worth knowing cold.
//   get bit i        (n >> i) & 1
//   set bit i        n | (1 << i)
//   clear bit i      n & ~(1 << i)
//   toggle bit i     n ^ (1 << i)
//   lowest set bit   n & -n
//   clear lowest set n & (n - 1)
//   power of two     n > 0 && (n & (n - 1)) == 0

// Count set bits by clearing the lowest one repeatedly: O(number of set bits),
// not O(32).
int countBits(int n) {
    int count = 0;
    while (n != 0) { n &= n - 1; count++; }
    return count;
}

// BIT FLIPS TO CONVERT a TO b: the differing bits are exactly a ^ b.
int flips(int a, int b) { return Integer.bitCount(a ^ b); }

// DIVIDE WITHOUT / OR *: subtract the largest shifted multiple that still
// fits, highest shift first. Work in long — Integer.MIN_VALUE / -1 overflows.
int divide(int dividend, int divisor) {
    if (dividend == Integer.MIN_VALUE && divisor == -1) return Integer.MAX_VALUE;
    boolean negative = (dividend < 0) != (divisor < 0);
    long a = Math.abs((long) dividend), b = Math.abs((long) divisor);

    long quotient = 0;
    for (int shift = 31; shift >= 0; shift--) {
        if ((b << shift) <= a) {
            a -= b << shift;
            quotient |= 1L << shift;
        }
    }
    return (int) (negative ? -quotient : quotient);
}`,
    },
    recall: [
      "`n & (n - 1)` clears the lowest set bit; `n & -n` isolates it. These two cover most problems",
      "a power of two has exactly one set bit: `n > 0 && (n & (n-1)) == 0`",
      "the bits that differ between a and b are a ^ b, so flips = bitCount(a ^ b)",
      "shifts have lower precedence than you expect in Java and C — parenthesise `(1 << i)` always",
      "1 << 31 overflows an int; use 1L for anything above bit 30",
      ">> is arithmetic (sign-extending) and >>> is logical in Java; this matters for negative numbers",
      "Integer.MIN_VALUE / -1 is the overflow case every division problem tests",
    ],
    complexity: { time: "O(1) or O(32) per operation", space: "O(1)" },
    traps: [
      "missing parentheses around a shift in a larger expression",
      "1 << 31 instead of 1L << 31",
      ">> where >>> was meant on a negative number",
      "forgetting the MIN_VALUE / −1 overflow case",
      "shifting by 32 or more, which is undefined-ish (Java masks the count to 5 bits)",
    ],
    problems: [
      "introduction-to-bits-and-tricks",
      "step-08-bit-manipulation__count-number-of-bits-to-be-flipped-to-convert-a-to-b",
      "step-08-bit-manipulation__divide-two-integers-without-using-multiplication-division-and-mod-operator",
    ],
  },

  {
    id: "xor-properties",
    title: "XOR properties",
    family: "bits",
    aka: ["single number", "XOR of range", "appears once", "self cancelling"],
    hook: "x ^ x is 0 and x ^ 0 is x, so XOR-ing everything cancels the pairs and leaves the odd one out.",
    cues: [
      "every element appears twice except one",
      "every element appears three times except one — that one needs bit counting instead",
      "two elements appear once and the rest twice",
      "the XOR of a whole range of numbers",
      "O(1) space demanded, where a hash map would be the obvious answer",
    ],
    template: {
      java: `// APPEARS ONCE, others twice: XOR everything. The pairs cancel.
int singleNumber(int[] a) {
    int x = 0;
    for (int v : a) x ^= v;
    return x;
}

// OTHERS THREE TIMES: XOR no longer cancels, so count each bit position
// modulo 3 instead. The bits whose count is not divisible by 3 are the answer.
int singleNumberII(int[] a) {
    int result = 0;
    for (int bit = 0; bit < 32; bit++) {
        int count = 0;
        for (int v : a) count += (v >> bit) & 1;
        if (count % 3 != 0) result |= 1 << bit;
    }
    return result;
}

// TWO appear once, the rest twice: XOR everything to get p ^ q. Any set bit in
// that result is a bit where p and q DIFFER, so partition the array by it —
// each group now has one unique element and pairs.
int[] singleNumberIII(int[] a) {
    int xor = 0;
    for (int v : a) xor ^= v;
    int lowest = xor & -xor;              // a bit where they differ
    int p = 0, q = 0;
    for (int v : a) {
        if ((v & lowest) != 0) p ^= v;
        else q ^= v;
    }
    return new int[] { p, q };
}

// XOR OF 1..n has a period-4 pattern, so it is O(1):
//   n % 4 == 0 -> n     |  1 -> 1  |  2 -> n + 1  |  3 -> 0
// XOR of a range L..R is then xorTo(R) ^ xorTo(L - 1).`,
    },
    recall: [
      "x ^ x = 0, x ^ 0 = x, and XOR is commutative and associative — so order never matters",
      "pairs cancel; triples do not, which is why “others three times” counts bits modulo 3",
      "for two unique elements, the overall XOR is p ^ q, and any of its set bits separates them",
      "n & -n isolates the lowest set bit and is the cleanest way to pick that separator",
      "XOR of 1..n has a period-4 closed form, so range XOR is prefix ^ prefix",
      "a ^ b gives the differing bits, which is the same fact underneath the bit-flip count",
    ],
    complexity: {
      time: "O(n), or O(32n) for the modulo-3 variant, O(1) for a range XOR",
      space: "O(1)",
    },
    traps: [
      "expecting XOR to isolate an element that appears three times",
      "using the sign bit carelessly in the modulo-3 loop — iterate all 32 bits and let the sign bit fall out",
      "picking a separator bit that is not set in p ^ q",
      "off-by-one in xorTo(L − 1) when L is 0",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__find-the-number-that-appears-once-and-other-numbers-twice",
      "step-08-bit-manipulation__find-the-number-that-appears-odd-number-of-times",
      "single-number-ii",
      "single-number-iii",
      "xor-of-numbers-in-a-given-range",
    ],
    borrows: [
      "step-03-solve-problems-on-arrays__find-missing-number-in-an-array",
      "step-08-bit-manipulation__count-number-of-bits-to-be-flipped-to-convert-a-to-b",
    ],
  },

  {
    id: "bitmask-subsets",
    title: "Subsets by bitmask",
    family: "bits",
    aka: ["power set bit manipulation", "bitmask enumeration", "iterate all subsets"],
    hook: "The integers 0 to 2^n − 1 are the subsets: bit i set means element i is in.",
    cues: [
      "enumerate every subset without recursion",
      "n is at most about 20, and subsets need an index you can store",
      "a DP over subsets, where the mask is the state",
    ],
    template: {
      java: `// Each mask from 0 to 2^n - 1 is one subset. No recursion, no backtracking.
List<List<Integer>> powerSet(int[] a) {
    int n = a.length;
    List<List<Integer>> out = new ArrayList<>();
    for (int mask = 0; mask < (1 << n); mask++) {
        List<Integer> subset = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0) subset.add(a[i]);
        }
        out.add(subset);
    }
    return out;
}

// Useful mask moves:
//   size of the subset       Integer.bitCount(mask)
//   add element i            mask | (1 << i)
//   remove element i         mask & ~(1 << i)
//   is i in the subset       (mask & (1 << i)) != 0
//   iterate the SUBMASKS of mask:
//       for (int sub = mask; sub > 0; sub = (sub - 1) & mask) { ... }
//     which visits every subset of mask exactly once, in O(3^n) overall
//     across all masks.`,
    },
    recall: [
      "mask bit i set means element i is included — that is the entire encoding",
      "the loop bound is `mask < (1 << n)`, and 1 << n overflows an int at n = 31",
      "Integer.bitCount gives the subset size for free",
      "the submask enumeration `sub = (sub - 1) & mask` is the idiom for subset-of-subset DPs",
      "bitmask enumeration gives subsets in a fixed numeric order; recursion gives them in tree order, and some problems care",
      "n above about 22 makes 2^n impractical regardless of the method",
    ],
    complexity: {
      time: "O(2^n · n)",
      space: "O(1) beyond the output",
    },
    traps: [
      "1 << n overflowing for large n",
      "`mask & (1 << i)` compared against 1 rather than != 0",
      "assuming a particular subset ordering that the numeric enumeration does not give",
    ],
    problems: ["step-07-recursion__print-all-subsequences-power-set"],
  },

  {
    id: "string-manipulation",
    title: "String manipulation",
    family: "strings",
    aka: ["reverse words", "palindrome check", "count and say", "bracket reversals", "run length"],
    hook: "Mostly careful index work: split, reverse, count runs, or track a balance.",
    cues: [
      "reverse the words of a sentence, or each word in place",
      "a palindrome check with characters to ignore",
      "describe the previous string's runs — count and say",
      "the fewest bracket flips to balance an expression",
    ],
    template: {
      java: `// Reverse the WORD ORDER: split on runs of whitespace, then join backwards.
// Watch for leading, trailing and repeated spaces.
String reverseWords(String s) {
    String[] parts = s.trim().split("\\\\s+");
    StringBuilder sb = new StringBuilder();
    for (int i = parts.length - 1; i >= 0; i--) {
        sb.append(parts[i]);
        if (i > 0) sb.append(' ');
    }
    return sb.toString();
}
// Reverse EACH WORD in place, keeping the order: reverse the whole string,
// then reverse each word — or just reverse each word's own range.

// PALINDROME with characters to skip: two pointers, advancing past anything
// that does not count.
boolean isPalindrome(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        while (i < j && !Character.isLetterOrDigit(s.charAt(i))) i++;
        while (i < j && !Character.isLetterOrDigit(s.charAt(j))) j--;
        if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j))) return false;
        i++;
        j--;
    }
    return true;
}

// COUNT AND SAY: build term n from term n-1 by run-length encoding it.
String countAndSay(int n) {
    String cur = "1";
    for (int k = 1; k < n; k++) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cur.length(); ) {
            int j = i;
            while (j < cur.length() && cur.charAt(j) == cur.charAt(i)) j++;
            sb.append(j - i).append(cur.charAt(i));
            i = j;
        }
        cur = sb.toString();
    }
    return cur;
}

// MINIMUM BRACKET REVERSALS: cancel matched pairs, leaving some number of
// unmatched ')' then unmatched '('. The answer is
//     ceil(close / 2) + ceil(open / 2)
// and it is impossible when the total length is odd.`,
    },
    recall: [
      "split on \\\\s+ after trimming, or repeated spaces produce empty words",
      "build strings with a StringBuilder; repeated concatenation in a loop is O(n²)",
      "a palindrome check that skips characters needs the i < j guard inside both inner loops",
      "count and say is run-length encoding applied repeatedly — the run scan is the whole body",
      "bracket reversals: cancel pairs first, then ceil(unmatched close / 2) + ceil(unmatched open / 2)",
      "an odd-length bracket string can never be balanced",
      "Java strings are immutable; char[] or StringBuilder is what you mutate",
    ],
    complexity: {
      time: "O(n) per pass",
      space: "O(n)",
    },
    traps: [
      "splitting on a single space and getting empty tokens",
      "string concatenation inside a loop",
      "missing the i < j guard in the skip loops, running off the end",
      "integer division instead of a ceiling in the bracket count",
    ],
    problems: [
      "step-05-strings__reverse-words-in-a-given-string-palindrome-check",
      "step-05-strings__reverse-every-word-in-a-string",
      "step-18-strings__count-and-say",
      "step-18-strings__minimum-number-of-bracket-reversals-needed-to-make-an-expression-balanced",
    ],
    borrows: [
      "subsets-i",
      "step-08-bit-manipulation__power-set",
    ],
  },

  {
    id: "prefix-function",
    title: "The prefix function — KMP, Z and rolling hash",
    family: "strings",
    aka: ["KMP", "LPS array", "failure function", "Z function", "Rabin-Karp", "longest happy prefix", "shortest palindrome"],
    hook: "For each position, the longest prefix that is also a suffix — one array that answers almost every matching question.",
    cues: [
      "find a pattern inside a text in O(n + m)",
      "the longest prefix that is also a suffix — stated directly, or as “longest happy prefix”",
      "the shortest characters to prepend to make a palindrome",
      "the smallest repeating unit of a string",
      "many patterns against one text, where hashing is easier than building several automata",
    ],
    template: {
      java: `// LPS / prefix function: lps[i] is the length of the longest proper prefix of
// s[0..i] that is also a suffix of it. This one array is KMP, the happy
// prefix, the period, and the palindrome trick.
int[] buildLps(String s) {
    int n = s.length();
    int[] lps = new int[n];
    for (int i = 1, len = 0; i < n; i++) {
        while (len > 0 && s.charAt(i) != s.charAt(len)) len = lps[len - 1];
        if (s.charAt(i) == s.charAt(len)) len++;
        lps[i] = len;
    }
    return lps;
}
// The while loop is the whole algorithm: on a mismatch, fall back to the next
// best border rather than restarting. Each character advances len at most
// once, so the total work is linear.

// KMP SEARCH: build the lps of the pattern, then walk the text without ever
// moving backwards in it.
List<Integer> search(String text, String pattern) {
    int[] lps = buildLps(pattern);
    List<Integer> at = new ArrayList<>();
    for (int i = 0, j = 0; i < text.length(); i++) {
        while (j > 0 && text.charAt(i) != pattern.charAt(j)) j = lps[j - 1];
        if (text.charAt(i) == pattern.charAt(j)) j++;
        if (j == pattern.length()) { at.add(i - j + 1); j = lps[j - 1]; }
    }
    return at;
}

// What the lps gives you directly:
//   LONGEST HAPPY PREFIX     lps[n - 1]
//   SMALLEST PERIOD          n - lps[n - 1], and the string is a repetition
//                            exactly when n % that == 0
//   SHORTEST PALINDROME      build lps of (s + "#" + reverse(s)); the final
//                            value is the longest palindromic prefix of s, and
//                            the rest of s reversed is what to prepend. The
//                            '#' separator is essential — without it the
//                            border can span the join.

// Z FUNCTION: z[i] is the length of the longest substring starting at i that
// matches a prefix of s. Equivalent power, often easier to reason about.
int[] zFunction(String s) {
    int n = s.length();
    int[] z = new int[n];
    for (int i = 1, l = 0, r = 0; i < n; i++) {
        if (i < r) z[i] = Math.min(r - i, z[i - l]);
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}

// RABIN-KARP: a rolling hash over the text, comparing hashes and verifying on
// a match. Use two moduli or a large random one — a single small modulus is
// attackable and collides in practice.`,
    },
    recall: [
      "lps[i] is the longest proper prefix of the prefix ending at i that is also its suffix",
      "on a mismatch, fall back with `len = lps[len - 1]` — that is the one line that makes it linear",
      "longest happy prefix is lps[n−1], with no extra work",
      "smallest period is n − lps[n−1]; the string repeats exactly when n is divisible by it",
      "shortest palindrome builds the lps of s + separator + reverse(s), and the separator must not appear in s",
      "after a full match, continue with j = lps[j−1] to find overlapping occurrences",
      "the Z function carries the same information; pick whichever you can write correctly from memory",
      "Rabin-Karp must verify on a hash match, and needs a large or doubled modulus",
    ],
    complexity: {
      time: "O(n + m) for KMP and Z; Rabin-Karp O(n + m) expected, O(n·m) worst",
      space: "O(m) for the lps, O(n) for Z",
    },
    traps: [
      "`len = lps[len]` instead of `lps[len - 1]`",
      "resetting j to 0 after a full match and missing overlapping occurrences",
      "omitting the separator in the palindrome construction, letting a border cross the join",
      "not verifying a Rabin-Karp hash match",
      "an lps built over the text instead of the pattern",
    ],
    problems: [
      "kmp-algorithm-or-lps-array",
      "step-18-strings__longest-happy-prefix",
      "step-18-strings__z-function",
      "step-18-strings__shortest-palindrome",
      "step-18-strings__rabin-karp",
    ],
  },

  {
    id: "sieve-and-factorisation",
    title: "Sieve & prime factorisation",
    family: "maths",
    aka: ["sieve of Eratosthenes", "primes till n", "prime factorisation", "smallest prime factor"],
    hook: "Cross out the multiples once, and every prime question up to n becomes a lookup.",
    cues: [
      "all the primes up to n, or how many in a range",
      "factorise many numbers, not just one",
      "repeated primality tests, where a per-query trial division is too slow",
    ],
    template: {
      java: `// SIEVE: start each inner loop at p * p, because smaller multiples of p
// already have a smaller prime factor and were crossed out earlier.
boolean[] sieve(int n) {
    boolean[] composite = new boolean[n + 1];
    for (int p = 2; (long) p * p <= n; p++) {
        if (composite[p]) continue;
        for (int m = p * p; m <= n; m += p) composite[m] = true;
    }
    return composite;                      // !composite[i] && i >= 2 => prime
}

// SMALLEST PRIME FACTOR sieve — strictly better when you need factorisations.
// Build it once, then each number factorises in O(log n) with no division
// search at all.
int[] smallestPrimeFactor(int n) {
    int[] spf = new int[n + 1];
    for (int i = 2; i <= n; i++) {
        if (spf[i] != 0) continue;
        for (int m = i; m <= n; m += i) if (spf[m] == 0) spf[m] = i;
    }
    return spf;
}

List<Integer> factorise(int x, int[] spf) {
    List<Integer> out = new ArrayList<>();
    while (x > 1) { out.add(spf[x]); x /= spf[x]; }
    return out;
}

// ONE number, no sieve: trial division up to sqrt(x). Whatever is left above 1
// at the end is itself prime, and that final step is the one people forget.
List<Integer> factoriseOne(int x) {
    List<Integer> out = new ArrayList<>();
    for (int p = 2; (long) p * p <= x; p++) {
        while (x % p == 0) { out.add(p); x /= p; }
    }
    if (x > 1) out.add(x);
    return out;
}

// COUNT PRIMES IN L..R with R large but R - L small: sieve up to sqrt(R), then
// use those primes to mark composites in the window [L, R] — a segmented sieve.`,
    },
    recall: [
      "the inner loop starts at p·p, and the outer loop only needs to reach sqrt(n)",
      "build a smallest-prime-factor sieve whenever you need factorisations rather than just primality",
      "trial division for one number stops at sqrt(x), and the leftover above 1 is prime — do not drop it",
      "p * p overflows an int for p above about 46000; cast to long in the condition",
      "a range with a huge R but a small window needs a segmented sieve, built from primes up to sqrt(R)",
      "the sieve is O(n log log n), which is effectively linear",
      "1 is neither prime nor composite, and 2 is the only even prime — both are standard off-by-ones here",
    ],
    complexity: {
      time: "O(n log log n) to sieve, O(log n) per factorisation with spf, O(sqrt(x)) for one number",
      space: "O(n)",
    },
    traps: [
      "starting the inner loop at 2p instead of p·p (correct but slower) or at p (an infinite loop)",
      "p * p overflowing in the loop condition",
      "forgetting the leftover factor above 1 in trial division",
      "treating 1 as prime",
      "allocating a sieve of size R when R is 10¹² instead of segmenting",
    ],
    problems: [
      "print-all-primes-till-n",
      "prime-factorisation-of-a-number",
      "step-08-bit-manipulation__sieve-of-eratosthenes",
    ],
    borrows: [
      "count-of-prime-numbers-till-n",
      "step-01-learn-the-basics__check-for-prime",
    ],
  },
];
