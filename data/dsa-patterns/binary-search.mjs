// @ts-check
// Binary search — step 5. Five patterns, and the split that matters is between
// the first two and the third: searching an array you were given, versus
// searching a range of *answers* you invented. Striver calls the latter "On
// answers", and it is the one that transfers to problems that never mention
// sorting at all (Koko, Aggressive Cows, Painter's Partition, Split Array).
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "bs-sorted-array",
    title: "Binary search on a sorted array",
    family: "binary-search",
    aka: ["lower bound", "upper bound", "first occurrence", "last occurrence", "floor", "ceil"],
    hook: "Halve the range each step, and keep the candidate you have seen rather than returning early.",
    cues: [
      "a sorted array and a target, or “the smallest element that is at least X”",
      "first or last occurrence, or how many times a value appears",
      "insert position, floor, ceil — all of them are lower/upper bound in disguise",
      "O(log n) is demanded, or the input size is 10**5 or more with a sorted array",
    ],
    template: {
      java: `// Plain search. Compute mid as low + (high - low) / 2: (low + high) / 2
// overflows once the indices get large.
int search(int[] a, int target) {
    int low = 0, high = a.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

// LOWER BOUND — the first index with a[i] >= target, or a.length if there is
// none. Write every "first/last/count" question in terms of this one.
int lowerBound(int[] a, int target) {
    int low = 0, high = a.length - 1, ans = a.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] >= target) {
            ans = mid;            // a candidate — keep it and look left
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

// upperBound: the same with a[mid] > target.
//   first occurrence  = lowerBound(target), valid if a[i] == target
//   last occurrence   = upperBound(target) - 1
//   count             = upperBound(target) - lowerBound(target)
//   insert position   = lowerBound(target)
//   floor             = lowerBound(target) - 1 (last value <= target)`,
      python: `from bisect import bisect_left, bisect_right

# bisect_left IS lower bound, bisect_right IS upper bound. Use them.
def count(a: list[int], target: int) -> int:
    return bisect_right(a, target) - bisect_left(a, target)`,
    },
    recall: [
      "mid = low + (high - low) // 2, never (low + high) // 2",
      "the keep-a-candidate shape — record ans, then keep shrinking — is what turns a search into a bound",
      "lower bound is the one primitive; first, last, count, insert, floor and ceil are all arithmetic on it",
      "count = upperBound − lowerBound, with no second pass",
      "Python has bisect_left / bisect_right built in; Java has no int[] overload of Arrays.binarySearch that gives a bound, so write it",
      "`while (low <= high)` with `high = mid - 1` is the inclusive form; mixing it with the exclusive `low < high` form is where off-by-ones come from — pick one and always write it the same way",
    ],
    complexity: {
      time: "O(log n)",
      space: "O(1)",
      note: "About 17 steps for n = 10⁵, 30 for 10⁹ — which is why searching an answer range of 10⁹ is cheap.",
    },
    traps: [
      "(low + high) / 2 overflowing for large indices",
      "returning as soon as a match is found when the *first* match is wanted",
      "mixing the inclusive and exclusive loop forms in one function, so a bound is off by one",
      "forgetting that lowerBound can return a.length, and indexing with it",
    ],
    problems: [
      "step-04-binary-search__binary-search-to-find-x-in-sorted-array",
      "step-04-binary-search__implement-lower-bound",
      "step-04-binary-search__implement-upper-bound",
      "step-04-binary-search__search-insert-position",
      "step-04-binary-search__floor-ceil-in-sorted-array",
      "step-04-binary-search__find-the-first-or-last-occurrence-of-a-given-number-in-a-sorted-array",
      "step-04-binary-search__count-occurrences-of-a-number-in-a-sorted-array-with-duplicates",
    ],
    borrows: [
      "step-14-binary-search-trees__search-in-a-binary-search-tree",
    ],
  },

  {
    id: "bs-broken-sorted",
    title: "Binary search on a broken sort",
    family: "binary-search",
    aka: ["rotated sorted array", "pivot", "find peak", "single element", "partially sorted"],
    hook: "The array is not sorted, but one half of every split still is — find which, and discard the other.",
    cues: [
      "a sorted array that has been rotated by some unknown amount",
      "“find the peak” / the one unpaired element, with O(log n) demanded on unsorted input",
      "neighbouring elements never tie, and the shape guarantees an answer exists",
      "a strictly increasing then decreasing run — a mountain",
    ],
    template: {
      java: `// Rotated array: at every mid, exactly one side is properly sorted. Decide
// whether the target is inside that side; if not, it is in the other one.
int searchRotated(int[] a, int target) {
    int low = 0, high = a.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] == target) return mid;

        if (a[low] <= a[mid]) {                   // left half is sorted
            if (a[low] <= target && target < a[mid]) high = mid - 1;
            else low = mid + 1;
        } else {                                  // right half is sorted
            if (a[mid] < target && target <= a[high]) low = mid + 1;
            else high = mid - 1;
        }
    }
    return -1;
}

// With DUPLICATES, a[low] == a[mid] == a[high] tells you nothing about which
// side is sorted. Shrink both ends by one and continue — worst case O(n), and
// there is no way around it.
//    if (a[low] == a[mid] && a[mid] == a[high]) { low++; high--; continue; }

// PEAK: compare mid with its neighbour and walk uphill. The slope tells you
// which side must contain a peak, with no sorted assumption at all.
int findPeak(int[] a) {
    int low = 0, high = a.length - 1;
    while (low < high) {                          // exclusive form: one survivor
        int mid = low + (high - low) / 2;
        if (a[mid] < a[mid + 1]) low = mid + 1;   // uphill to the right
        else high = mid;                          // mid could be the peak
    }
    return low;
}

// SINGLE ELEMENT among pairs: before the odd one out, pairs start at even
// indices; after it, they start at odd. Binary search on that parity flip.`,
    },
    recall: [
      "the invariant is “one half is sorted”, found with a[low] <= a[mid]",
      "having identified the sorted half, the question is only whether target lies inside its range",
      "duplicates break the test; the low++/high-- fallback is correct and unavoidably O(n) worst case",
      "minimum in a rotated array = the pivot; answer = min(a[low], a[mid]) kept as you discard the sorted half",
      "rotation count = the pivot's index",
      "peak and single-element use the *exclusive* form (low < high, high = mid), which converges on one survivor with no `ans` variable",
      "for the single element, check the parity of the index you are at — that is the whole trick",
    ],
    complexity: {
      time: "O(log n), degrading to O(n) for a rotated array with many duplicates",
      space: "O(1)",
    },
    traps: [
      "using a[low] < a[mid] instead of <=, which mishandles a two-element window",
      "applying the rotated-array test unchanged when duplicates are allowed",
      "mixing the inclusive and exclusive loop forms — peak needs `low < high` and `high = mid`, and `high = mid - 1` loses the answer",
      "reading a[mid + 1] without the exclusive form guaranteeing mid + 1 is in range",
    ],
    problems: [
      "step-04-binary-search__search-in-rotated-sorted-array-i",
      "step-04-binary-search__search-in-rotated-sorted-array-ii",
      "step-04-binary-search__find-minimum-in-rotated-sorted-array",
      "step-04-binary-search__find-out-how-many-times-has-an-array-been-rotated",
      "step-04-binary-search__single-element-in-a-sorted-array",
      "step-04-binary-search__find-peak-element",
    ],
  },

  {
    id: "bs-on-answers",
    title: "Binary search on the answer",
    family: "binary-search",
    aka: ["binary search on answers", "parametric search", "monotonic predicate", "minimise the maximum", "Koko", "aggressive cows"],
    hook: "Guess the answer, write a cheap feasibility check, and binary search the guess.",
    cues: [
      "“minimise the maximum …” or “maximise the minimum …” — the giveaway phrasing",
      "the smallest speed / capacity / divisor / number of days that makes something fit",
      "nothing in the problem is sorted, but the answer lives in a numeric range you can state",
      "if an answer works, every larger (or smaller) one works too — that monotonicity is the whole requirement",
      "a brute force over every candidate answer would be right but too slow",
    ],
    template: {
      java: `// The shape. Two decisions and the rest is boilerplate:
//   1. what is the range of possible answers?
//   2. can(x) — is x feasible? It must be monotone in x.
int smallestFeasible(int low, int high) {
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (can(mid)) {
            ans = mid;            // feasible — try smaller
            high = mid - 1;
        } else {
            low = mid + 1;        // infeasible — must go bigger
        }
    }
    return ans;
}

// Koko eating bananas: can(speed) = hours needed at this speed fits in h.
// Range is 1 .. max(piles).
boolean can(int speed, int[] piles, int h) {
    long hours = 0;
    for (int p : piles) hours += (p + speed - 1) / speed;   // ceil division
    return hours <= h;
}

// Aggressive Cows / gas stations flip the direction: a LARGER minimum distance
// is harder, so feasible means "try bigger" and ans is kept on success while
// low = mid + 1.
//
// Split Array / Painter's / Book Allocation are one problem: can(limit) counts
// the greedy number of chunks whose sum stays under limit, and asks whether
// that is <= k. Range is max(element) .. sum(all).`,
      python: `def smallest_feasible(lo: int, hi: int, can) -> int:
    ans = hi
    while lo <= hi:
        mid = (lo + hi) // 2
        if can(mid):
            ans = mid
            hi = mid - 1
        else:
            lo = mid + 1
    return ans`,
    },
    recall: [
      "name the two things explicitly before writing any code: the answer range, and can(x)",
      "can(x) must be monotone — true for everything above x, or everything below. No monotonicity, no binary search",
      "“minimise the maximum” and “maximise the minimum” are the same template with the comparison flipped",
      "the lower bound of the range is usually max(element) and the upper bound sum(all) — not 0 and 10**9",
      "ceil division without floating point: (a + b - 1) / b",
      "sum the feasibility check into a long; the range is wide enough that int overflows",
      "Split Array largest sum, Painter's Partition and Book Allocation are literally the same problem — recognising that is worth more than solving each",
    ],
    complexity: {
      time: "O(n · log(range))",
      space: "O(1)",
      note: "log of a 10⁹ range is 30, so the feasibility check runs about 30 times. That is why a linear can(x) is fine.",
    },
    traps: [
      "a feasibility check that is not actually monotone, which makes the search meaningless",
      "starting the range at 0 when 0 can never be feasible, or ending it too low to contain the answer",
      "integer division truncating where a ceiling is meant",
      "overflow in can(x) when the counter is an int",
      "flipping the direction by accident on a maximise problem — write down which side keeps `ans` first",
      "returning low or high instead of the recorded ans",
    ],
    problems: [
      "step-04-binary-search__find-square-root-of-a-number-in-log-n",
      "step-04-binary-search__find-the-nth-root-of-a-number-using-binary-search",
      "step-04-binary-search__find-the-smallest-divisor",
      "step-04-binary-search__koko-eating-bananas",
      "step-04-binary-search__minimum-days-to-make-m-bouquets",
      "step-04-binary-search__capacity-to-ship-packages-within-d-days",
      "step-04-binary-search__kth-missing-positive-number",
      "step-04-binary-search__aggressive-cows",
      "step-04-binary-search__book-allocation-problem",
      "step-04-binary-search__painter-s-partition",
      "step-04-binary-search__split-array-largest-sum",
      "step-04-binary-search__minimize-max-distance-to-gas-station",
    ],
  },

  {
    id: "bs-two-arrays",
    title: "Binary search across two sorted arrays",
    family: "binary-search",
    aka: ["median of two sorted arrays", "kth element of two arrays", "partition search"],
    hook: "Search the size of the cut, not the values: how many of the answer come from the first array?",
    cues: [
      "two sorted arrays and a median, or the k-th smallest of their union",
      "O(log(n + m)) demanded, so merging them is already too slow",
      "the answer is a position in a merged array you are not allowed to build",
    ],
    template: {
      java: `// Binary search how many elements the LEFT part takes from the smaller
// array. The cut is correct when both "left" maxima are <= both "right" minima.
double median(int[] a, int[] b) {
    if (a.length > b.length) return median(b, a);     // search the smaller one
    int n = a.length, m = b.length, total = n + m;
    int half = (total + 1) / 2;                       // size of the left part

    int low = 0, high = n;                            // take 0..n from a
    while (low <= high) {
        int fromA = low + (high - low) / 2;
        int fromB = half - fromA;
        if (fromB < 0) { high = fromA - 1; continue; }
        if (fromB > m) { low = fromA + 1; continue; }

        int leftA  = fromA == 0 ? Integer.MIN_VALUE : a[fromA - 1];
        int rightA = fromA == n ? Integer.MAX_VALUE : a[fromA];
        int leftB  = fromB == 0 ? Integer.MIN_VALUE : b[fromB - 1];
        int rightB = fromB == m ? Integer.MAX_VALUE : b[fromB];

        if (leftA <= rightB && leftB <= rightA) {     // valid cut
            int maxLeft = Math.max(leftA, leftB);
            if (total % 2 == 1) return maxLeft;
            return (maxLeft + Math.min(rightA, rightB)) / 2.0;
        }
        if (leftA > rightB) high = fromA - 1;         // took too many from a
        else low = fromA + 1;                         // took too few
    }
    return 0;
}

// The k-th element is the same cut with half = k.`,
    },
    recall: [
      "always search the smaller array, so the index range stays 0..n and fromB cannot run wild",
      "the search space is the *count* taken from the left array, not a value",
      "half = (n + m + 1) / 2 makes the odd case fall out as max(leftA, leftB)",
      "use ±infinity sentinels for the empty-side cases rather than branching on them",
      "the valid-cut condition is leftA <= rightB && leftB <= rightA — both ways round",
      "k-th element is the same code with half = k",
    ],
    complexity: {
      time: "O(log(min(n, m)))",
      space: "O(1)",
    },
    traps: [
      "searching the larger array and letting fromB go negative or past m",
      "using 0 instead of MIN_VALUE as the empty-left sentinel, which breaks on negative inputs",
      "checking only one half of the valid-cut condition",
      "integer-dividing the even-case average and losing the .5",
    ],
    problems: [
      "step-04-binary-search__median-of-2-sorted-arrays",
      "step-04-binary-search__kth-element-of-2-sorted-arrays",
    ],
  },

  {
    id: "bs-2d",
    title: "Binary search on a matrix",
    family: "binary-search",
    aka: ["search 2D matrix", "staircase search", "row with maximum ones", "matrix median"],
    hook: "Either flatten it into one sorted list, or start at a corner where each step rules out a whole row or column.",
    cues: [
      "a matrix sorted row-wise *and* where each row starts after the previous one ends — that is one sorted array",
      "sorted along rows and columns independently, with no relation between them — that is the staircase",
      "the row with the most 1s, where every row is sorted",
      "the median of a whole matrix, too large to flatten",
    ],
    template: {
      java: `// Fully sorted (each row continues the previous): treat it as one array of
// length rows*cols and convert the index.
boolean searchFlat(int[][] m, int target) {
    int rows = m.length, cols = m[0].length;
    int low = 0, high = rows * cols - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        int value = m[mid / cols][mid % cols];        // the whole trick
        if (value == target) return true;
        if (value < target) low = mid + 1;
        else high = mid - 1;
    }
    return false;
}

// Row- and column-sorted only: start top-right. Too big => move left (that
// column cannot help). Too small => move down. Each step kills a row or a
// column, so it is O(rows + cols).
boolean searchStaircase(int[][] m, int target) {
    int r = 0, c = m[0].length - 1;
    while (r < m.length && c >= 0) {
        if (m[r][c] == target) return true;
        if (m[r][c] > target) c--;
        else r++;
    }
    return false;
}

// Row with the most 1s: lowerBound(1) in each row; cols - that index is the
// count. O(rows · log cols).
//
// Matrix median: binary search the VALUE, counting how many entries are <= mid
// with a lowerBound per row. This is binary search on the answer (see that
// pattern) with the matrix only used by the counting step.`,
    },
    recall: [
      "mid / cols and mid % cols is the flatten; never actually build the flat array",
      "the two sortedness guarantees are different problems — read the statement carefully before choosing",
      "the staircase must start at top-right (or bottom-left): a corner where one direction increases and the other decreases",
      "the staircase is O(rows + cols), not logarithmic, and that is optimal for this guarantee",
      "matrix median is binary search on the value, with a count-of-elements-<=-x check",
      "peak in 2-D: binary search the columns, taking each column's row-wise maximum",
    ],
    complexity: {
      time: "flattened O(log(r·c)) · staircase O(r + c) · median O(r · log c · log(range))",
      space: "O(1)",
    },
    traps: [
      "flattening a matrix that is only row- and column-sorted, where rows do not continue each other",
      "starting the staircase at top-left, where both directions increase and no step rules anything out",
      "swapping / and % in the index conversion",
      "rows * cols overflowing an int on a very large matrix",
    ],
    problems: [
      "step-04-binary-search__find-the-row-with-maximum-number-of-1-s",
      "step-04-binary-search__search-in-a-2-d-matrix",
      "step-04-binary-search__search-in-a-row-and-column-wise-sorted-matrix",
      "step-04-binary-search__find-peak-element-2d-matrix",
      "step-04-binary-search__matrix-median",
    ],
  },
];
