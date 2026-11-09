// @ts-check
// Sliding window and two pointers — step 10.
//
// The split that matters is the third pattern: "count the subarrays with
// exactly K" is not a window problem at all until you rewrite it as
// atMost(K) - atMost(K-1). Striver groups these four under "Counting
// Subarrays", which names the question but not the trick.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "window-template",
    title: "The window template",
    family: "windows",
    aka: ["sliding window", "two pointer", "variable window"],
    hook: "Two indices, both only ever moving right; expand to include, shrink to fix.",
    cues: [
      "a contiguous subarray or substring, and the array is not sorted",
      "the four shapes: fixed size, longest valid, shortest valid, count valid",
      "a nested loop over every start and end that is O(n²) and needs to be O(n)",
    ],
    template: {
      java: `// The one skeleton. Which of the four questions you are answering changes
// only the shrink condition and where you record the answer.
int window(int[] a) {
    int left = 0, best = 0;
    for (int right = 0; right < a.length; right++) {
        // 1. include a[right]
        add(a[right]);

        // 2. shrink while the window is invalid (or oversized)
        while (!valid()) {
            remove(a[left]);
            left++;
        }

        // 3. record. For LONGEST, here, after shrinking: the window is valid.
        best = Math.max(best, right - left + 1);
    }
    return best;
}

// For SHORTEST, shrink while the window is STILL valid, and record inside
// the while loop just before removing:
//    while (valid()) { best = Math.min(best, right - left + 1); remove(a[left++]); }
//
// For COUNT of valid windows ending at right, add (right - left + 1) after
// shrinking — every suffix of a valid window is valid.
//
// Window length is always right - left + 1. Write it once, out loud.`,
    },
    recall: [
      "both pointers only move forward; that is why the whole thing is O(n) despite the inner loop",
      "length = right − left + 1, every time",
      "longest: shrink until valid, then record. shortest: record while valid, then shrink. Getting these the wrong way round is the bug",
      "the state in the window is usually a frequency map or a single counter, not a rescan",
      "the inner while runs at most n times in total across the whole loop, not n times per iteration",
      "a fixed-size window needs no while at all: add the right, remove the left once the size is exceeded",
    ],
    complexity: {
      time: "O(n), or O(n · 26) with a fixed alphabet frequency array",
      space: "O(1) for a fixed alphabet, O(k) for a hash map",
      note: "Each index is added once and removed at most once — that is the amortised argument.",
    },
    traps: [
      "an inner loop that moves left back to the start, making it O(n²)",
      "recording the answer before shrinking on a longest problem, so an invalid window counts",
      "off-by-one on the length: right − left, or right − left − 1",
      "forgetting to remove the outgoing element's contribution from the frequency state",
    ],
    problems: ["theory"],
  },

  {
    id: "fixed-window",
    title: "Fixed-size window",
    family: "windows",
    aka: ["constant window", "window of size k", "maximum points from cards"],
    hook: "Slide a window of exactly k: add the one coming in, remove the one going out.",
    cues: [
      "the window size is given in the problem — “of size k”, “k consecutive”",
      "“take k items from either end”, which is a fixed window on the complement",
      "an average, sum or max over every k-length run",
    ],
    template: {
      java: `// Build the first window, then slide. No inner loop, no validity check.
int bestSum(int[] a, int k) {
    int sum = 0;
    for (int i = 0; i < k; i++) sum += a[i];
    int best = sum;
    for (int right = k; right < a.length; right++) {
        sum += a[right] - a[right - k];      // in, and out, in one step
        best = Math.max(best, sum);
    }
    return best;
}

// "Maximum points from cards": you take k cards from the two ends combined.
// Taking k from the ends is the same as LEAVING a contiguous window of
// n - k cards in the middle, so minimise that window's sum — or, equivalently,
// start with the first k and swap one in from the right each step:
//    left sum of k, then for i in 0..k-1: move one card from the left end to
//    the right end and keep the best total.`,
    },
    recall: [
      "the slide is one add and one remove: a[right] in, a[right - k] out",
      "build the first window before the loop, and start the loop at index k",
      "“k from the two ends” inverts into one contiguous window of n − k in the middle",
      "no while loop and no validity predicate — if you are writing one, the size is not actually fixed",
    ],
    complexity: {
      time: "O(n)",
      space: "O(1)",
    },
    traps: [
      "forgetting to remove a[right - k], so the window grows instead of sliding",
      "starting the slide loop at 0 and double-counting the first window",
      "an array shorter than k — guard it",
    ],
    problems: [
      "step-10-sliding-window-two-pointer-combined-problems__maximum-point-you-can-obtain-from-cards",
    ],
    borrows: [
      "step-03-solve-problems-on-arrays__longest-subarray-with-given-sum-k-positives",
    ],
  },

  {
    id: "longest-window",
    title: "Longest valid window",
    family: "windows",
    aka: ["longest substring", "at most k distinct", "max consecutive ones", "character replacement", "fruit into baskets"],
    hook: "Grow the window greedily; whenever it breaks the rule, pull the left edge in until it holds again.",
    cues: [
      "“longest substring / subarray such that …”",
      "“at most k” of something — distinct characters, zeros flipped, replacements made",
      "no repeated character, or at most two kinds of fruit",
      "the constraint gets *harder* as the window grows, which is what makes shrinking the fix",
    ],
    template: {
      java: `// Longest window with at most k distinct characters. The shape generalises:
// swap the frequency map and the validity test for the specific rule.
int longestAtMostKDistinct(String s, int k) {
    Map<Character, Integer> freq = new HashMap<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        freq.merge(s.charAt(right), 1, Integer::sum);

        while (freq.size() > k) {                   // invalid: too many kinds
            char out = s.charAt(left++);
            if (freq.merge(out, -1, Integer::sum) == 0) freq.remove(out);
        }
        best = Math.max(best, right - left + 1);    // valid now
    }
    return best;
}

// The variants, all the same skeleton:
//   no repeating characters  -> shrink while freq[s[right]] > 1
//   max consecutive ones III -> count zeros in the window, shrink while > k
//   fruit into baskets       -> at most 2 distinct
//   character replacement    -> shrink while (length - maxFreqInWindow) > k,
//                               i.e. more than k characters would need changing`,
      python: `from collections import defaultdict

def longest_at_most_k_distinct(s: str, k: int) -> int:
    freq: dict[str, int] = defaultdict(int)
    left = best = 0
    for right, ch in enumerate(s):
        freq[ch] += 1
        while len(freq) > k:
            out = s[left]
            freq[out] -= 1
            if freq[out] == 0:
                del freq[out]
            left += 1
        best = max(best, right - left + 1)
    return best`,
    },
    recall: [
      "record the answer *after* the shrink loop, when the window is valid again",
      "delete a key when its count hits zero, or freq.size() keeps counting characters that left",
      "“at most k zeros flipped” is just a zero-counter; no map needed",
      "character replacement: cost = length − (count of the most frequent character). The classic optimisation never decreases maxFreq, which still gives the right answer because only a longer window can beat the best",
      "a fixed alphabet means an int[26] or int[128], which is much faster than a HashMap",
      "the window never needs to shrink by more than it grew, so left never overtakes right",
    ],
    complexity: {
      time: "O(n)",
      space: "O(k), or O(1) for a fixed alphabet",
    },
    traps: [
      "leaving zero-count keys in the map and misreading the distinct count",
      "recording the best length inside the shrink loop",
      "shrinking with `if` instead of `while`, which only fixes a single violation",
      "on character replacement, recomputing maxFreq by scanning the whole map every step — it turns O(n) into O(26n), which is fine, but recomputing over a HashMap of arbitrary keys is not",
    ],
    problems: [
      "step-10-sliding-window-two-pointer-combined-problems__longest-substring-without-repeating-characters",
      "step-10-sliding-window-two-pointer-combined-problems__max-consecutive-ones-iii",
      "step-10-sliding-window-two-pointer-combined-problems__fruit-into-baskets",
      "step-10-sliding-window-two-pointer-combined-problems__longest-substring-with-at-most-k-distinct-characters",
      "step-10-sliding-window-two-pointer-combined-problems__longest-repeating-character-replacement",
    ],
  },

  {
    id: "shortest-window",
    title: "Shortest valid window",
    family: "windows",
    aka: ["minimum window substring", "smallest window"],
    hook: "Grow until the window is good enough, then record and shrink while it stays good.",
    cues: [
      "“minimum window / shortest substring containing …”",
      "the constraint is a requirement to *meet*, not a budget to stay under",
      "it gets easier as the window grows, so you shrink while still valid rather than until valid",
    ],
    template: {
      java: `// Minimum window containing every character of t (with multiplicity).
// "have == need" is the cheap validity test: one counter, not a map compare.
String minWindow(String s, String t) {
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int required = t.length();                 // characters still owed

    int left = 0, bestLen = Integer.MAX_VALUE, bestAt = 0;
    for (int right = 0; right < s.length(); right++) {
        // Only a character we still owe reduces the debt.
        if (need[s.charAt(right)]-- > 0) required--;

        while (required == 0) {                // valid — record, then shrink
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestAt = left;
            }
            // Putting a needed character back re-creates the debt.
            if (need[s.charAt(left++)]++ >= 0) required++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestAt, bestAt + bestLen);
}`,
    },
    recall: [
      "shortest inverts longest: shrink *while valid*, and record inside that loop",
      "one integer counter of what is still owed beats comparing two frequency maps every step",
      "a count going negative is the surplus — that is exactly what lets the > 0 and >= 0 tests work",
      "record the start index and the length, not the substring, and slice once at the end",
      "initialise the best length to a sentinel and check it, since “no valid window” is a real answer",
      "the same shape solves minimum-size subarray with sum >= target, with the counter being the sum",
    ],
    complexity: {
      time: "O(n + m)",
      space: "O(1) for a fixed alphabet",
    },
    traps: [
      "shrinking until invalid rather than while valid, which skips the shortest window",
      "recording after the shrink loop, when the window has just been broken",
      "comparing full frequency maps for validity, turning each step into O(alphabet)",
      "building a substring on every improvement instead of remembering the indices",
    ],
    problems: [
      "step-10-sliding-window-two-pointer-combined-problems__minimum-window-substring",
    ],
  },

  {
    id: "count-subarrays",
    title: "Counting subarrays — the at-most trick",
    family: "windows",
    aka: ["exactly k", "at most k", "binary subarrays with sum", "nice subarrays", "k different integers"],
    hook: "“Exactly K” is not a window. Count at-most(K) and subtract at-most(K−1).",
    cues: [
      "“how many subarrays have exactly K …”",
      "“exactly” anything — distinct integers, odd numbers, a given sum on a 0/1 array",
      "you tried to slide a window on “exactly” and found it cannot shrink correctly",
      "“at least K” also shows up: that one is total − atMost(K−1)",
    ],
    template: {
      java: `// atMost(k) counts the subarrays with AT MOST k of the thing — a normal
// longest-window loop, where every valid window ending at 'right' contributes
// all (right - left + 1) of its suffixes.
int atMost(int[] a, int k) {
    if (k < 0) return 0;                          // guard for exactly(0)
    Map<Integer, Integer> freq = new HashMap<>();
    int left = 0, count = 0;
    for (int right = 0; right < a.length; right++) {
        freq.merge(a[right], 1, Integer::sum);
        while (freq.size() > k) {
            int out = a[left++];
            if (freq.merge(out, -1, Integer::sum) == 0) freq.remove(out);
        }
        count += right - left + 1;                // every suffix is valid
    }
    return count;
}

int exactly(int[] a, int k) {
    return atMost(a, k) - atMost(a, k - 1);       // the whole trick
}

// The disguises:
//   binary subarrays with sum = goal  -> "at most goal" on the running sum
//   count nice subarrays (k odds)     -> treat odd as 1, even as 0; same thing
//   subarrays with k different ints   -> atMost on the distinct count, as above`,
    },
    recall: [
      "every valid window ending at right contributes right − left + 1 subarrays, because each of its suffixes is also valid",
      "exactly(k) = atMost(k) − atMost(k−1); atLeast(k) = total − atMost(k−1)",
      "guard k < 0, because exactly(0) calls atMost(−1)",
      "total subarrays of an array of length n is n(n+1)/2 — needed for the atLeast form",
      "“count the odds” and “count the ones” are the same problem after mapping each element to 0 or 1",
      "two passes over the array is still O(n); do not try to fuse them into one clever loop",
    ],
    complexity: {
      time: "O(n) — two linear passes",
      space: "O(k)",
      note: "The count can exceed an int for n = 10⁵ (about 5 × 10⁹ subarrays), so return a long when the bound allows it.",
    },
    traps: [
      "trying to slide a window directly on “exactly k”, which has no valid shrink rule",
      "forgetting the k < 0 guard",
      "counting 1 per valid window instead of right − left + 1",
      "overflowing an int on the total count",
    ],
    problems: [
      "step-10-sliding-window-two-pointer-combined-problems__number-of-substring-containing-all-three-characters",
      "step-10-sliding-window-two-pointer-combined-problems__binary-subarray-with-sum",
      "step-10-sliding-window-two-pointer-combined-problems__count-number-of-nice-subarrays",
      "step-10-sliding-window-two-pointer-combined-problems__subarray-with-k-different-integers",
    ],
  },
];
