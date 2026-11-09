// @ts-check
// Sorting (step 2), arrays (step 3) and hashing (step 4).
//
// Two regroupings worth noticing. Count Inversions and Reverse Pairs sit in
// Striver's "Arrays / FAQs(Hard)", but they are merge sort with a counter in
// the merge step — so they live under sorting here. And the five "Hashing /
// FAQs" problems are one technique, prefix sum plus a hash map, which the
// section title does not say.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "sorting-algorithms",
    title: "The sorting algorithms",
    family: "sorting",
    aka: ["selection sort", "bubble sort", "insertion sort", "merge sort", "quick sort", "stability"],
    hook: "Know the five by their invariant, their complexity, and whether they are stable or in place.",
    cues: [
      "“implement sort X” or “explain the difference between…”",
      "a question about stability, or about sorting in O(1) extra space",
      "a nearly-sorted array, where insertion sort is genuinely the right answer",
      "a custom comparator, where what matters is the library sort's guarantees",
    ],
    template: {
      java: `// SELECTION: find the minimum of the unsorted part, swap it into place.
// O(n²) always. Not stable. Fewest swaps of the quadratic three.
for (int i = 0; i < n - 1; i++) {
    int min = i;
    for (int j = i + 1; j < n; j++) if (a[j] < a[min]) min = j;
    swap(a, i, min);
}

// BUBBLE: swap adjacent out-of-order pairs; the largest bubbles to the end.
// The swapped flag makes it O(n) on sorted input — the only reason to use it.
for (int i = n - 1; i > 0; i--) {
    boolean swapped = false;
    for (int j = 0; j < i; j++) {
        if (a[j] > a[j + 1]) { swap(a, j, j + 1); swapped = true; }
    }
    if (!swapped) break;
}

// INSERTION: shift the sorted prefix right to open a slot. O(n) on nearly
// sorted input, stable, and what library sorts use for small subarrays.
for (int i = 1; i < n; i++) {
    int key = a[i], j = i - 1;
    while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
}

// MERGE: split, sort both, merge. O(n log n) guaranteed, stable, O(n) space.
void mergeSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = lo + (hi - lo) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    merge(a, lo, mid, hi);                   // copy out, merge back
}

// QUICK: partition around a pivot, recurse on both sides. O(n log n) average,
// O(n²) worst, O(log n) stack, in place, NOT stable.
int partition(int[] a, int lo, int hi) {     // Lomuto, pivot = a[hi]
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++) if (a[j] < pivot) swap(a, i++, j);
    swap(a, i, hi);
    return i;
}`,
    },
    recall: [
      "merge sort is O(n log n) guaranteed and stable but needs O(n) space; quicksort is in place and faster in practice but O(n²) worst case and unstable",
      "insertion sort is O(n) on nearly-sorted input, which is why real library sorts fall back to it on small ranges",
      "bubble sort's only redeeming feature is the early exit on sorted input",
      "stable means equal elements keep their relative order — it matters as soon as you sort by one key and need a previous one preserved",
      "Java's Arrays.sort is dual-pivot quicksort for primitives (unstable) and TimSort for objects (stable). That difference catches people out",
      "a sorted or reverse-sorted array is quicksort's worst case with a naive last-element pivot; randomise or use the median of three",
      "selection sort does the fewest swaps, which only matters when a swap is expensive",
    ],
    complexity: {
      time: "selection/bubble/insertion O(n²) · merge O(n log n) · quick O(n log n) average, O(n²) worst",
      space: "O(1) for the first three and quicksort's partition, O(n) for merge",
      note: "No comparison sort can beat O(n log n); counting and radix sort can, by not comparing.",
    },
    traps: [
      "claiming quicksort is O(n log n) worst case",
      "assuming Arrays.sort is stable for int[] — it is not",
      "an off-by-one in merge's copy-back bounds",
      "a pivot choice that degrades on sorted input",
      "an insertion-sort inner loop that reads a[j] without the j >= 0 guard first",
    ],
    problems: [
      "step-02-learn-important-sorting-techniques__selection-sort",
      "step-02-learn-important-sorting-techniques__bubble-sort",
      "step-02-learn-important-sorting-techniques__recursive-bubble-sort",
      "step-02-learn-important-sorting-techniques__insertion-sort",
      "step-02-learn-important-sorting-techniques__merge-sort",
      "quick-sorting",
    ],
  },

  {
    id: "merge-sort-counting",
    title: "Counting pairs during a merge sort",
    family: "sorting",
    aka: ["count inversions", "reverse pairs", "divide and conquer counting"],
    hook: "While merging two sorted halves, every element left in the first half forms a pair with the one you just took.",
    cues: [
      "count the pairs (i, j) with i < j and some order relation between a[i] and a[j]",
      "inversions, or pairs where a[i] > 2·a[j]",
      "the brute force is every pair, O(n²), and O(n log n) is wanted",
      "the count is over a *global* relation, so no window or single scan can see it",
    ],
    template: {
      java: `// Merge sort, counting as you merge. Pairs within each half are counted by
// the recursive calls; this merge counts only the cross-half pairs.
long countInversions(int[] a, int lo, int hi) {
    if (lo >= hi) return 0;
    int mid = lo + (hi - lo) / 2;
    long count = countInversions(a, lo, mid) + countInversions(a, mid + 1, hi);

    // Both halves are now sorted. For each right element, how many left
    // elements exceed it? Because the left half is sorted, once a[i] > a[j]
    // every remaining left element does too — so add them all at once.
    int i = lo, j = mid + 1;
    List<Integer> merged = new ArrayList<>();
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) {
            merged.add(a[i++]);
        } else {
            count += (mid - i + 1);          // the whole rest of the left half
            merged.add(a[j++]);
        }
    }
    while (i <= mid) merged.add(a[i++]);
    while (j <= hi) merged.add(a[j++]);
    for (int k = 0; k < merged.size(); k++) a[lo + k] = merged.get(k);
    return count;
}

// REVERSE PAIRS counts a[i] > 2 * a[j], where the relation is not the sort
// order — so the counting must be a SEPARATE scan before the merge:
//    int k = lo;
//    for (int j = mid + 1; j <= hi; j++) {
//        while (k <= mid && a[k] <= 2L * a[j]) k++;
//        count += (mid - k + 1);
//    }
//    then merge normally.
// k never moves backwards across the whole loop, so this stays O(n).`,
    },
    recall: [
      "the recursion counts within each half; the merge counts only across the two halves",
      "when a left element beats a right one, ALL remaining left elements do too — that is where the log factor comes from",
      "if the relation is not the sort order (a[i] > 2·a[j]), count in a separate two-pointer scan before merging",
      "that separate scan is still O(n) because its pointer never retreats",
      "the count overflows an int at n ≈ 10⁵ — n(n−1)/2 is about 5 × 10⁹, so use a long",
      "2L * a[j], not 2 * a[j], or the doubling overflows before the comparison",
      "a Fenwick tree or BIT over compressed values is the alternative; the merge sort is easier to recall",
    ],
    complexity: {
      time: "O(n log n)",
      space: "O(n) for the merge buffer",
    },
    traps: [
      "counting 1 per inversion instead of the whole remaining left half",
      "int overflow on the count, and on the 2 * a[j] comparison",
      "forgetting to write the merged values back into the array",
      "trying to fold a non-sort-order relation into the merge comparison itself",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__count-inversions",
      "step-03-solve-problems-on-arrays__reverse-pairs",
    ],
    borrows: [
      "step-02-learn-important-sorting-techniques__merge-sort",
    ],
  },

  {
    id: "array-single-pass",
    title: "One pass, a few variables",
    family: "arrays",
    aka: ["largest element", "second largest", "linear search", "maximum consecutive ones", "running best"],
    hook: "Carry the answer so far and update it as you go — no sorting, no second pass.",
    cues: [
      "the largest, second largest, or longest run of something",
      "the obvious answer sorts the array, and O(n) without sorting is wanted",
      "“without sorting” stated outright",
    ],
    template: {
      java: `// Second largest in one pass. The order of the two updates is what makes it
// correct: check against the best FIRST, then against the runner-up.
int secondLargest(int[] a) {
    int best = Integer.MIN_VALUE, second = Integer.MIN_VALUE;
    for (int x : a) {
        if (x > best) { second = best; best = x; }
        else if (x > second && x != best) second = x;   // skip duplicates
    }
    return second == Integer.MIN_VALUE ? -1 : second;
}

// Longest run of a value: a running counter and a best.
int maxConsecutiveOnes(int[] a) {
    int run = 0, best = 0;
    for (int x : a) {
        run = x == 1 ? run + 1 : 0;        // reset on a break
        best = Math.max(best, run);
    }
    return best;
}`,
    },
    recall: [
      "update the best before the runner-up, or the runner-up gets the new best's value",
      "`x != best` is what makes second-largest ignore duplicates; decide whether the problem wants that",
      "a running count resets to 0 on a break and the best is taken every step, not only at a break",
      "guard the all-equal and single-element cases, where there is no second largest",
      "sentinel choice matters: MIN_VALUE only works if the real values cannot be MIN_VALUE",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "assigning second after overwriting best",
      "counting duplicates as the second largest when the problem says distinct",
      "taking the best only when the run ends, and missing a run that reaches the array's end",
      "an array of length 0 or 1",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__linear-search",
      "step-03-solve-problems-on-arrays__largest-element-in-an-array",
      "step-03-solve-problems-on-arrays__second-largest-element-in-an-array-without-sorting",
      "step-03-solve-problems-on-arrays__maximum-consecutive-ones",
    ],
  },

  {
    id: "array-reversal-tricks",
    title: "Rotation & next permutation by reversal",
    family: "arrays",
    aka: ["left rotate array", "rotate by k", "reversal algorithm", "next permutation"],
    hook: "Reversing three carefully chosen slices rotates an array in place — and the same move builds the next permutation.",
    cues: [
      "rotate by k places, in O(1) extra space",
      "“next lexicographic permutation”",
      "a problem that wants a suffix put into ascending order, which is a reverse when it is descending",
    ],
    template: {
      java: `// ROTATE LEFT by k: reverse the first k, reverse the rest, reverse the whole.
void rotateLeft(int[] a, int k) {
    int n = a.length;
    k %= n;                       // k may exceed n
    reverse(a, 0, k - 1);
    reverse(a, k, n - 1);
    reverse(a, 0, n - 1);
}

void reverse(int[] a, int i, int j) {
    while (i < j) { int t = a[i]; a[i++] = a[j]; a[j--] = t; }
}

// NEXT PERMUTATION — three steps, and the suffix is always descending.
void nextPermutation(int[] a) {
    int n = a.length, i = n - 2;
    // 1. Find the rightmost ascent. Everything to its right is descending,
    //    so it is already the largest arrangement of those elements.
    while (i >= 0 && a[i] >= a[i + 1]) i--;

    if (i >= 0) {
        // 2. Swap a[i] with the rightmost element greater than it.
        int j = n - 1;
        while (a[j] <= a[i]) j--;
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }
    // 3. The suffix is still descending — reverse it to the smallest order.
    //    When i < 0 the whole array was descending, so this resets it.
    reverse(a, i + 1, n - 1);
}`,
    },
    recall: [
      "rotation is three reversals, and k must be reduced modulo n first",
      "rotating left by k and right by n−k are the same operation",
      "next permutation: find the rightmost ascent, swap with the rightmost larger element, reverse the suffix",
      "the suffix after the pivot is always descending, which is why reversing it gives the smallest arrangement",
      "when no ascent exists the array was the last permutation, and reversing the whole thing gives the first",
      "the swap partner search uses a[j] <= a[i], so equal elements are skipped and the result stays strictly next",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "forgetting k %= n, so a large k walks the array repeatedly or goes out of bounds",
      "reversing the wrong three ranges — write the boundaries down",
      "in next permutation, scanning for the ascent with > instead of >=, which mishandles duplicates",
      "forgetting the i < 0 case, which must still reverse the whole array",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__left-rotate-an-array-by-one-place",
      "step-03-solve-problems-on-arrays__left-rotate-an-array-by-d-places",
      "step-03-solve-problems-on-arrays__next-permutation",
    ],
  },

  {
    id: "array-inplace-rearrange",
    title: "In-place rearrangement by two pointers",
    family: "arrays",
    aka: ["move zeros", "remove duplicates", "Dutch national flag", "sort 0s 1s 2s", "write pointer"],
    hook: "A read pointer scans and a write pointer trails it, so nothing needs a second array.",
    cues: [
      "“in place”, “O(1) extra space”, “return the new length”",
      "move all the zeros, or compact out the duplicates",
      "three distinct values to sort — that is Dutch national flag, one pass",
      "rearrange by sign, alternating",
    ],
    template: {
      java: `// Read/write pointers: write only the elements you want to keep.
int removeDuplicates(int[] a) {               // sorted input
    if (a.length == 0) return 0;
    int write = 1;
    for (int read = 1; read < a.length; read++) {
        if (a[read] != a[write - 1]) a[write++] = a[read];
    }
    return write;                             // the new length
}

// Move zeros to the end, keeping the order of the rest.
void moveZeros(int[] a) {
    int write = 0;
    for (int read = 0; read < a.length; read++) {
        if (a[read] != 0) { int t = a[write]; a[write++] = a[read]; a[read] = t; }
    }
}

// DUTCH NATIONAL FLAG — three values, ONE pass, three pointers. The invariant:
//   [0, low)      all 0s
//   [low, mid)    all 1s
//   [mid, high]   unknown
//   (high, n)     all 2s
void sort012(int[] a) {
    int low = 0, mid = 0, high = a.length - 1;
    while (mid <= high) {
        if (a[mid] == 0)      { swap(a, low++, mid++); }
        else if (a[mid] == 1) { mid++; }
        else                  { swap(a, mid, high--); }   // do NOT advance mid
    }
}
// On a 2, the value swapped in from high is unexamined, so mid must stay put.

// REARRANGE BY SIGN with equal counts: write positives to the even indices and
// negatives to the odd ones, using a separate output array — O(n) space, but
// the in-place version does not preserve order and the problem usually
// requires that it does.`,
    },
    recall: [
      "read scans, write trails; the write index is the answer when a new length is wanted",
      "Dutch national flag's invariant is four regions — write them down before coding",
      "on hitting a 2, swap with high and do NOT advance mid, because the incoming value has not been examined",
      "mid <= high, not mid < high, or the last element is never classified",
      "counting the three values and overwriting is a valid two-pass answer; the one-pass version is what is being asked for",
      "“return the new length” means the tail of the array is allowed to hold anything",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "advancing mid after a swap with high",
      "mid < high as the loop condition",
      "moveZeros that overwrites instead of swapping, losing values",
      "assuming the in-place sign rearrangement preserves relative order",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__move-zeros-to-end",
      "step-03-solve-problems-on-arrays__remove-duplicates-from-sorted-array",
      "step-03-solve-problems-on-arrays__sort-an-array-of-0-s-1-s-and-2-s",
      "step-03-solve-problems-on-arrays__rearrange-the-array-in-alternating-positive-and-negative-items",
    ],
  },

  {
    id: "two-sorted-arrays",
    title: "Walking two sorted arrays",
    family: "arrays",
    aka: ["union of sorted arrays", "intersection", "merge without extra space", "gap method"],
    hook: "Two indices, always advancing the one pointing at the smaller value.",
    cues: [
      "union, intersection or merge of two already-sorted arrays",
      "duplicates to be collapsed while merging",
      "“merge without extra space”, which needs the gap method and is the hard one",
    ],
    template: {
      java: `// UNION: advance the smaller, and skip anything equal to what was last added.
List<Integer> union(int[] a, int[] b) {
    List<Integer> out = new ArrayList<>();
    int i = 0, j = 0;
    while (i < a.length && j < b.length) {
        int pick;
        if (a[i] < b[j]) pick = a[i++];
        else if (b[j] < a[i]) pick = b[j++];
        else { pick = a[i++]; j++; }          // equal: take once, advance both
        if (out.isEmpty() || out.get(out.size() - 1) != pick) out.add(pick);
    }
    while (i < a.length) { if (out.get(out.size() - 1) != a[i]) out.add(a[i]); i++; }
    while (j < b.length) { if (out.get(out.size() - 1) != b[j]) out.add(b[j]); j++; }
    return out;
}
// INTERSECTION: the same walk, adding only on equality.

// MERGE WITHOUT EXTRA SPACE — Shell sort's gap method over the two arrays
// treated as one virtual array of length n + m. Start with a gap of
// ceil((n+m)/2) and halve it, swapping any out-of-order pair that distance
// apart, until the gap reaches 0.
void mergeInPlace(int[] a, int[] b) {
    int n = a.length, m = b.length, total = n + m;
    for (int gap = (total + 1) / 2; gap > 0; gap = gap == 1 ? 0 : (gap + 1) / 2) {
        for (int i = 0; i + gap < total; i++) {
            int j = i + gap;
            // Read across the boundary as if it were one array.
            int left  = i < n ? a[i] : b[i - n];
            int right = j < n ? a[j] : b[j - n];
            if (left > right) {
                if (j < n)      { a[i] = right; a[j] = left; }
                else if (i < n) { a[i] = right; b[j - n] = left; }
                else            { b[i - n] = right; b[j - n] = left; }
            }
        }
    }
}`,
    },
    recall: [
      "advance the index pointing at the smaller value; on a tie decide whether to advance one or both",
      "for a union, compare against the last value WRITTEN, not against the neighbour in the input",
      "the two drain loops after the main loop still need the duplicate check",
      "the gap method halves with ceil, and gap 1 must be followed by 0 or it loops forever",
      "the gap method is O((n+m)·log(n+m)) — worse than merging, and the price of O(1) space",
      "if extra space is allowed, just merge into a third array; only reach for the gap method when told not to",
    ],
    complexity: {
      time: "O(n + m) for union and intersection, O((n+m)·log(n+m)) for the in-place merge",
      space: "O(1) beyond the output",
    },
    traps: [
      "the ceil in the gap sequence — plain integer division gets stuck at 1",
      "comparing against the input neighbour rather than the last written value when deduplicating",
      "mishandling the three boundary cases in the virtual-array index arithmetic",
      "forgetting the drain loops entirely",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__find-the-union",
      "intersection-of-two-sorted-arrays",
      "step-03-solve-problems-on-arrays__merge-two-sorted-arrays-without-extra-space",
    ],
  },

  {
    id: "kadane",
    title: "Kadane — best subarray ending here",
    family: "arrays",
    aka: ["Kadane's algorithm", "maximum subarray sum", "maximum product subarray", "running sum reset"],
    hook: "Keep the best sum ending at this index; whenever it goes negative, start again.",
    cues: [
      "maximum (or minimum) sum of a contiguous subarray",
      "maximum product, which needs the minimum tracked too because of negatives",
      "the subarray bounds must be printed, not just the value",
      "a sliding window will not work because the elements can be negative",
    ],
    template: {
      java: `// A negative running sum can only hurt what follows, so drop it.
int maxSubarraySum(int[] a) {
    int best = a[0], run = 0;
    for (int x : a) {
        run += x;
        best = Math.max(best, run);
        if (run < 0) run = 0;              // restart after recording
    }
    return best;
}
// Order matters: record the best BEFORE resetting, or an all-negative array
// returns 0 instead of its largest element.

// PRINTING the subarray: remember where the current run started.
int[] maxSubarrayBounds(int[] a) {
    int best = Integer.MIN_VALUE, run = 0, start = 0, bestL = 0, bestR = 0;
    for (int i = 0; i < a.length; i++) {
        if (run == 0) start = i;           // a fresh run begins here
        run += a[i];
        if (run > best) { best = run; bestL = start; bestR = i; }
        if (run < 0) run = 0;
    }
    return new int[] { bestL, bestR };
}

// MAXIMUM PRODUCT: a negative times a negative is positive, so the smallest
// product so far is a candidate for the largest. Track both, and swap them
// when the incoming element is negative.
int maxProduct(int[] a) {
    int best = a[0], curMax = a[0], curMin = a[0];
    for (int i = 1; i < a.length; i++) {
        int x = a[i];
        if (x < 0) { int t = curMax; curMax = curMin; curMin = t; }
        curMax = Math.max(x, curMax * x);
        curMin = Math.min(x, curMin * x);
        best = Math.max(best, curMax);
    }
    return best;
}
// The prefix/suffix-product alternative: the answer is always a prefix or a
// suffix product, so two passes resetting on each zero also works.`,
    },
    recall: [
      "record the best before resetting the run, or an all-negative array gives 0",
      "initialise best to a[0] or MIN_VALUE, never 0, unless the empty subarray is allowed",
      "to print the bounds, note the start index whenever the run restarts at 0",
      "for products, carry both the maximum and the minimum, and swap them on a negative element",
      "a zero resets a product run entirely — start fresh from the next element",
      "minimum subarray sum is Kadane on the negated array",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "resetting before recording the best",
      "best initialised to 0, which is wrong for an all-negative array",
      "forgetting to track the minimum product and missing the two-negatives case",
      "int overflow on the product — use long where the bounds allow",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__kadane-s-algorithm-maximum-subarray-sum",
      "step-03-solve-problems-on-arrays__print-subarray-with-maximum-subarray-sum-extended-version-of-above-problem",
      "step-03-solve-problems-on-arrays__maximum-product-subarray",
    ],
  },

  {
    id: "k-sum",
    title: "k-Sum — sort, fix, converge",
    family: "arrays",
    aka: ["two sum", "3 sum", "4 sum", "two pointer convergence"],
    hook: "Fix k−2 of the indices with loops, and let two pointers converge over the sorted remainder.",
    cues: [
      "find two, three or four numbers summing to a target",
      "duplicate triplets or quadruplets must not be reported twice",
      "two-sum on an *unsorted* array wanting indices — that one is a hash map, not pointers",
    ],
    template: {
      java: `// TWO SUM, indices wanted, unsorted: a hash map in one pass. Sorting would
// destroy the indices, so this is the one case that is not two pointers.
int[] twoSum(int[] a, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < a.length; i++) {
        Integer j = seen.get(target - a[i]);
        if (j != null) return new int[] { j, i };
        seen.put(a[i], i);                 // put AFTER looking up, so i != j
    }
    return new int[] { -1, -1 };
}

// 3 SUM: sort, fix the first, converge on the rest. Skipping duplicates at
// each level is what keeps the output unique — and it is the whole difficulty.
List<List<Integer>> threeSum(int[] a) {
    Arrays.sort(a);
    List<List<Integer>> out = new ArrayList<>();
    for (int i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;        // skip duplicate first
        int lo = i + 1, hi = a.length - 1;
        while (lo < hi) {
            int sum = a[i] + a[lo] + a[hi];
            if (sum == 0) {
                out.add(List.of(a[i], a[lo], a[hi]));
                lo++;
                hi--;
                while (lo < hi && a[lo] == a[lo - 1]) lo++;   // skip dupes
                while (lo < hi && a[hi] == a[hi + 1]) hi--;
            } else if (sum < 0) {
                lo++;
            } else {
                hi--;
            }
        }
    }
    return out;
}

// 4 SUM: two nested loops plus the same convergence, with a duplicate skip at
// both fixed levels. Sum into a long — four ints can overflow.`,
    },
    recall: [
      "indices wanted and unsorted means a hash map; values wanted means sort and converge",
      "in the hash-map version, look up before inserting, or an element pairs with itself",
      "sort first for 3-sum and 4-sum; the convergence depends on it",
      "the duplicate skip happens at every level: the fixed loops and both pointers after a hit",
      "`i > 0 && a[i] == a[i-1]` compares with the previous, not the next — comparing forwards skips the first of a group",
      "4-sum sums into a long, since four ints near the limit overflow",
      "k-sum generalises: k−2 nested loops around one convergence, O(n^(k−1))",
    ],
    complexity: {
      time: "two sum O(n) hashed · 3 sum O(n²) · 4 sum O(n³)",
      space: "O(n) for the hash map, O(1) for the convergence beyond the sort",
    },
    traps: [
      "inserting into the hash map before looking up",
      "forgetting a duplicate skip and emitting the same triplet twice",
      "comparing a[i] with a[i+1] for the skip, which drops valid first elements",
      "overflow on the 4-sum total",
      "a loop bound of a.length rather than a.length − 2, going out of range",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__2sum-problem",
      "step-03-solve-problems-on-arrays__3-sum-problem",
      "step-03-solve-problems-on-arrays__4-sum-problem",
    ],
    borrows: [
      "step-14-binary-search-trees__two-sum-in-bst-check-if-there-exists-a-pair-with-sum-k",
    ],
  },

  {
    id: "voting-and-math-identities",
    title: "Voting & arithmetic identities",
    family: "arrays",
    aka: ["majority element", "Boyer-Moore voting", "missing number", "repeating and missing", "XOR trick"],
    hook: "Cancel pairs to find a majority, or use a sum or XOR identity to find what is missing.",
    cues: [
      "an element appearing more than n/2 or n/3 times, in O(1) space",
      "one number missing from 1..n, or one missing and one repeated",
      "O(1) space demanded, so a frequency map is out",
      "the array is a permutation with a small defect",
    ],
    template: {
      java: `// BOYER-MOORE: a candidate and a count. A different element cancels one vote.
// An element appearing more than n/2 times survives every cancellation.
int majority(int[] a) {
    int candidate = 0, count = 0;
    for (int x : a) {
        if (count == 0) { candidate = x; count = 1; }
        else if (x == candidate) count++;
        else count--;
    }
    // VERIFY: without a guaranteed majority, the survivor may not be one.
    count = 0;
    for (int x : a) if (x == candidate) count++;
    return count > a.length / 2 ? candidate : -1;
}
// MORE THAN n/3: at most two such elements exist, so carry TWO candidates and
// two counts, then verify both. The generalisation to n/k needs k-1 slots.

// MISSING NUMBER from 1..n: XOR everything with 1..n. Every present number
// cancels itself and the missing one remains. Overflow-proof, unlike the sum.
int missing(int[] a, int n) {
    int x = 0;
    for (int v : a) x ^= v;
    for (int i = 1; i <= n; i++) x ^= i;
    return x;
}

// REPEATING AND MISSING, both at once. Two equations:
//   S  = sum(a) - sum(1..n)       = repeated - missing
//   S2 = sum(a²) - sum(1..n²)     = repeated² - missing²
//                                 = (repeated + missing)(repeated - missing)
// so repeated + missing = S2 / S, and the two sums give both values.
// Use long: sum of squares to 10⁵ is about 3.3 × 10¹⁴.
// The XOR alternative: xor everything, take the lowest set bit, and partition
// the numbers by that bit — each group yields one of the two values.`,
    },
    recall: [
      "Boyer-Moore is candidate plus count, and the verification pass is not optional unless a majority is guaranteed",
      "more than n/3 allows at most two such elements, so two candidates and two counts",
      "XOR beats the sum formula for a single missing number: no overflow, and self-cancelling",
      "n(n+1)/2 overflows an int around n = 65536 — use a long",
      "repeating-and-missing: the sum and the sum of squares give two equations in two unknowns",
      "the XOR partition alternative splits on the lowest set bit of the overall XOR",
      "a frequency array is the obvious O(n)-space answer; these tricks exist only for the O(1) constraint",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "skipping the verification pass on Boyer-Moore",
      "in the n/3 version, letting the two candidates be initialised to the same value",
      "int overflow on the sums",
      "integer division in S2 / S — check the divisibility, or use longs throughout",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__majority-element-n-2-times",
      "step-03-solve-problems-on-arrays__majority-element-n-3-times",
      "step-03-solve-problems-on-arrays__find-missing-number-in-an-array",
      "step-03-solve-problems-on-arrays__find-the-repeating-and-missing-number",
    ],
  },

  {
    id: "suffix-scan",
    title: "Scanning from the right",
    family: "arrays",
    aka: ["leaders in an array", "suffix maximum", "right to left scan"],
    hook: "Some questions about “everything to the right” become one variable if you walk the other way.",
    cues: [
      "an element compared against all the elements after it",
      "“leaders” — elements greater than everything to their right",
      "the brute force is a nested loop over every suffix",
    ],
    template: {
      java: `// Walk right to left carrying the running maximum of the suffix.
List<Integer> leaders(int[] a) {
    List<Integer> out = new ArrayList<>();
    int maxRight = Integer.MIN_VALUE;
    for (int i = a.length - 1; i >= 0; i--) {
        if (a[i] > maxRight) out.add(a[i]);     // nothing to its right beats it
        maxRight = Math.max(maxRight, a[i]);
    }
    Collections.reverse(out);                   // restore left-to-right order
    return out;
}`,
    },
    recall: [
      "walking right to left turns “all elements after i” into one running variable",
      "compare before updating the running maximum, or every element looks like a leader",
      "the output comes out reversed — reverse it if order matters",
      "the last element is always a leader, by definition",
      "prefix and suffix arrays are the two-pass generalisation when both directions are needed at once",
    ],
    complexity: { time: "O(n)", space: "O(1) beyond the output" },
    traps: [
      "updating the running maximum before the comparison",
      "returning the result in reverse order",
      "strict versus non-strict comparison when duplicates exist",
    ],
    problems: ["step-03-solve-problems-on-arrays__leaders-in-an-array-problem"],
  },

  {
    id: "matrix-inplace",
    title: "In-place matrix manipulation",
    family: "arrays",
    aka: ["rotate matrix 90 degrees", "spiral order", "set matrix zeroes", "transpose"],
    hook: "Transpose then reverse to rotate; use the first row and column as your own marker storage.",
    cues: [
      "rotate a matrix by 90 degrees in place",
      "print the matrix in spiral order",
      "set whole rows and columns to zero, without an extra O(m+n) array",
      "boundary pointers shrinking inwards",
    ],
    template: {
      java: `// ROTATE 90 CLOCKWISE: transpose, then reverse each row. Two simple passes
// beat one confusing four-way cycle swap.
void rotate(int[][] m) {
    int n = m.length;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {        // j starts at i + 1
            int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
        }
    }
    for (int[] row : m) {
        for (int i = 0, j = n - 1; i < j; i++, j--) {
            int t = row[i]; row[i] = row[j]; row[j] = t;
        }
    }
}
// Anticlockwise: transpose, then reverse the COLUMNS instead.

// SPIRAL: four boundaries, shrinking. The two guards in the middle are what
// stop a single remaining row or column being printed twice.
List<Integer> spiral(int[][] m) {
    List<Integer> out = new ArrayList<>();
    int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.add(m[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) out.add(m[r][right]);
        right--;
        if (top <= bottom) {                     // guard
            for (int c = right; c >= left; c--) out.add(m[bottom][c]);
            bottom--;
        }
        if (left <= right) {                     // guard
            for (int r = bottom; r >= top; r--) out.add(m[r][left]);
            left++;
        }
    }
    return out;
}

// SET MATRIX ZEROES in O(1) space: use row 0 and column 0 as the markers for
// the rest. Column 0 is overloaded (it marks its own row), so track whether
// column 0 itself must be zeroed in a separate variable, and write the first
// row and column LAST.`,
    },
    recall: [
      "rotate = transpose + reverse rows; the transpose's inner loop must start at i + 1 or it swaps everything back",
      "anticlockwise reverses the columns instead of the rows",
      "spiral needs all four boundaries and the two mid-loop guards; without them a lone row prints twice",
      "set-matrix-zeroes in O(1) space uses the first row and column as marker storage",
      "column 0 does double duty in that trick, so it needs its own flag",
      "write the marker row and column last, after every other cell has been decided",
    ],
    complexity: {
      time: "O(rows · cols)",
      space: "O(1)",
    },
    traps: [
      "an inner transpose loop starting at 0, undoing every swap",
      "missing spiral guards, duplicating the middle row or column",
      "in set-matrix-zeroes, clearing the markers before reading them",
      "forgetting that column 0 needs separate handling",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__rotate-matrix-by-90-degrees",
      "step-03-solve-problems-on-arrays__print-the-matrix-in-spiral-manner",
      "step-03-solve-problems-on-arrays__set-matrix-zeros",
    ],
  },

  {
    id: "pascals-triangle",
    title: "Pascal's triangle — three different questions",
    family: "arrays",
    aka: ["Pascal's triangle", "binomial coefficient", "nCr"],
    hook: "One element, one row, or the whole triangle — and each wants a different method.",
    cues: [
      "a specific entry, a specific row, or the first n rows",
      "binomial coefficients, or combinations",
      "the row-by-row build is O(n²) when only one row is needed",
    ],
    template: {
      java: `// ONE ELEMENT at (row, col), 1-indexed: it is C(row-1, col-1). Compute it
// multiplicatively, dividing as you go so nothing overflows unnecessarily.
long nCr(int n, int r) {
    r = Math.min(r, n - r);                  // C(n,r) == C(n,n-r)
    long res = 1;
    for (int i = 0; i < r; i++) {
        res = res * (n - i) / (i + 1);       // exact at every step
    }
    return res;
}

// ONE ROW: each entry is the previous times (n-i)/(i+1). O(n), no table.
List<Long> row(int n) {                      // 0-indexed row n
    List<Long> out = new ArrayList<>();
    long value = 1;
    out.add(value);
    for (int i = 0; i < n; i++) {
        value = value * (n - i) / (i + 1);
        out.add(value);
    }
    return out;
}

// THE WHOLE TRIANGLE: each entry is the sum of the two above it. O(n²), which
// is optimal because the output itself is O(n²).
List<List<Integer>> triangle(int n) {
    List<List<Integer>> out = new ArrayList<>();
    for (int r = 0; r < n; r++) {
        List<Integer> cur = new ArrayList<>();
        for (int c = 0; c <= r; c++) {
            if (c == 0 || c == r) cur.add(1);
            else cur.add(out.get(r - 1).get(c - 1) + out.get(r - 1).get(c));
        }
        out.add(cur);
    }
    return out;
}`,
    },
    recall: [
      "three questions, three methods: nCr for one element, the multiplicative recurrence for one row, the additive build for the whole triangle",
      "C(n, r) = C(n, n−r), so always compute with the smaller r",
      "res = res * (n − i) / (i + 1) stays exact at every step — the division always divides evenly, so do not reorder it",
      "building the whole triangle to answer a single-element query is the wasteful mistake this pattern exists to flag",
      "the whole-triangle build is O(n²) and that is optimal, since the output is that big",
      "use long: C(30, 15) is already about 1.5 × 10⁸, and it grows fast",
    ],
    complexity: {
      time: "O(r) for one element, O(n) for one row, O(n²) for the triangle",
      space: "O(1), O(n), O(n²) respectively",
    },
    traps: [
      "computing a factorial and dividing, which overflows long by about 21!",
      "reordering the multiply and divide, breaking the exact-division property",
      "1-indexed problem statements against 0-indexed nCr arguments",
      "building the triangle for a single-entry query",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__pascal-s-triangle",
      "pascals-triangle-ii",
      "pascals-triangle-iii",
    ],
  },

  {
    id: "hashing-basics",
    title: "Hashing & set membership",
    family: "hashing",
    aka: ["basic hashing", "frequency map", "longest consecutive sequence", "hash set"],
    hook: "Trade memory for time: a set answers “have I seen this” in O(1).",
    cues: [
      "counting occurrences, or checking membership repeatedly",
      "“without sorting”, where the sorted answer is O(n log n) and O(n) is wanted",
      "the longest run of consecutive integers, in any order",
      "small bounded values, where an array beats a hash map",
    ],
    template: {
      java: `// Frequency counting: an int[] for bounded values, a map otherwise.
int[] freq = new int[26];
for (char c : s.toCharArray()) freq[c - 'a']++;

Map<Integer, Integer> count = new HashMap<>();
for (int x : a) count.merge(x, 1, Integer::sum);

// LONGEST CONSECUTIVE SEQUENCE in O(n): only start counting from a number
// that has no predecessor in the set. Each element is then visited at most
// twice overall, so the inner while loop does NOT make this O(n²).
int longestConsecutive(int[] a) {
    Set<Integer> set = new HashSet<>();
    for (int x : a) set.add(x);
    int best = 0;
    for (int x : set) {
        if (set.contains(x - 1)) continue;      // not the start of a run
        int len = 1;
        while (set.contains(x + len)) len++;
        best = Math.max(best, len);
    }
    return best;
}`,
    },
    recall: [
      "an int[] is far faster than a HashMap when the values are bounded and small",
      "the consecutive-sequence trick is to start only from an element with no predecessor — that is what makes it O(n)",
      "iterate the SET, not the array, so duplicates do not restart the same run",
      "Java boxing makes HashMap<Integer, Integer> noticeably slow in tight loops; an int[] or a primitive map avoids it",
      "a hash map gives O(1) average, not worst case — adversarial inputs can degrade it",
      "sorting is the O(n log n) alternative for most of these, and is often simpler to write correctly",
    ],
    complexity: {
      time: "O(n) average",
      space: "O(n)",
    },
    traps: [
      "an inner while loop without the predecessor check, making it O(n²)",
      "iterating the array instead of the set and redoing work for duplicates",
      "a frequency array too small for the actual character or value range",
      "`==` on boxed Integers above 127, where the cache stops and reference equality fails",
    ],
    problems: [
      "basic-hashing-2",
      "step-03-solve-problems-on-arrays__longest-consecutive-sequence-in-an-array",
    ],
  },

  {
    id: "prefix-sum-hashmap",
    title: "Prefix sum + hash map",
    family: "hashing",
    aka: ["subarray sum equals k", "longest subarray with sum k", "zero sum subarray", "subarray xor k", "prefix sum"],
    hook: "A subarray's sum is a difference of two prefix sums, so store the prefixes you have seen.",
    cues: [
      "a subarray with a given sum, longest or counted, where the values can be negative",
      "“largest subarray with sum 0”",
      "the same question with XOR instead of sum",
      "a sliding window fails because negatives mean the running sum is not monotone",
    ],
    template: {
      java: `// sum(i..j) = prefix[j] - prefix[i-1]. So for each j, the question is how
// many earlier prefixes equal prefix[j] - k.

// COUNT the subarrays with sum k.
int countSubarrays(int[] a, int k) {
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1);                       // the empty prefix, so a subarray
                                          // starting at index 0 is counted
    int prefix = 0, count = 0;
    for (int x : a) {
        prefix += x;
        count += seen.getOrDefault(prefix - k, 0);
        seen.merge(prefix, 1, Integer::sum);
    }
    return count;
}

// LONGEST subarray with sum k: store the EARLIEST index for each prefix, so
// the span is as long as possible. putIfAbsent, not put.
int longestSubarray(int[] a, int k) {
    Map<Integer, Integer> firstAt = new HashMap<>();
    firstAt.put(0, -1);                   // prefix 0 before the array starts
    int prefix = 0, best = 0;
    for (int i = 0; i < a.length; i++) {
        prefix += a[i];
        Integer at = firstAt.get(prefix - k);
        if (at != null) best = Math.max(best, i - at);
        firstAt.putIfAbsent(prefix, i);   // keep the EARLIEST
    }
    return best;
}
// Largest subarray with sum 0 is this with k = 0.

// XOR instead of sum: identical, because xor(i..j) = prefix[j] ^ prefix[i-1],
// so the value to look up is prefix ^ k.
//    count += seen.getOrDefault(prefix ^ k, 0);

// When every value is POSITIVE, a sliding window is O(1) space and simpler —
// see the windows family. The map is what handles negatives.`,
    },
    recall: [
      "seed the map with prefix 0 — count 1, or index −1 — or subarrays starting at index 0 are missed",
      "counting stores counts; longest stores the EARLIEST index, via putIfAbsent",
      "look up prefix − k for sums and prefix ^ k for XOR; the structure is the same",
      "all-positive values mean a sliding window works and is simpler; this technique is for negatives",
      "the lookup must happen before inserting the current prefix, or a zero-length subarray matches",
      "use long for the prefix when the values are large",
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    traps: [
      "not seeding prefix 0",
      "using put instead of putIfAbsent in the longest variant, losing the longest span",
      "inserting the current prefix before the lookup",
      "reaching for a sliding window when negatives are present",
    ],
    problems: [
      "step-03-solve-problems-on-arrays__longest-subarray-with-given-sum-k-positives",
      "step-03-solve-problems-on-arrays__longest-subarray-with-sum-k-positives-negatives",
      "step-03-solve-problems-on-arrays__largest-subarray-with-0-sum",
      "step-03-solve-problems-on-arrays__count-subarrays-with-given-sum",
      "step-03-solve-problems-on-arrays__count-number-of-subarrays-with-given-xor-k",
    ],
  },
];
