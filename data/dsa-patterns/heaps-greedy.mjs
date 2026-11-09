// @ts-check
// Heaps (step 14) and Greedy (step 9).
//
// The regrouping worth noticing in Greedy: Striver's "Scheduling and Interval
// Problems" holds two different techniques. Picking the most meetings is an
// exchange argument — sort by END time and take greedily. Merging overlapping
// intervals is a sweep — sort by START and extend. They sort by different keys
// and get confused with each other constantly, so they separate here.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "heap-internals",
    title: "The heap itself",
    family: "heaps",
    aka: ["heapify", "build heap", "sift down", "heap sort", "priority queue internals"],
    hook: "A complete binary tree flattened into an array, where a node's children live at 2i+1 and 2i+2.",
    cues: [
      "“implement a min heap / max heap” or “heapify this array”",
      "“does this array represent a valid heap?”",
      "sorting in O(n log n) with O(1) extra space",
      "you need to know why building a heap is O(n) and not O(n log n)",
    ],
    template: {
      java: `// Array layout: children of i are 2i+1 and 2i+2, parent of i is (i-1)/2.
// Everything is sift-down; sift-up is only needed for insert.
void siftDown(int[] a, int i, int n) {
    while (true) {
        int smallest = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && a[l] < a[smallest]) smallest = l;
        if (r < n && a[r] < a[smallest]) smallest = r;
        if (smallest == i) return;              // heap property restored
        int t = a[i]; a[i] = a[smallest]; a[smallest] = t;
        i = smallest;
    }
}

// Build in O(n), not O(n log n): start at the last PARENT and work backwards.
// Most nodes are near the leaves and barely move, and the sum of the heights
// converges to 2n.
void buildHeap(int[] a) {
    for (int i = a.length / 2 - 1; i >= 0; i--) siftDown(a, i, a.length);
}

void insert(int[] a, int n, int x) {            // sift UP
    a[n] = x;
    int i = n;
    while (i > 0 && a[(i - 1) / 2] > a[i]) {
        int p = (i - 1) / 2;
        int t = a[i]; a[i] = a[p]; a[p] = t;
        i = p;
    }
}

// Heap sort: build a MAX heap, then repeatedly swap the root to the back and
// shrink. In place, O(n log n), not stable.
void heapSort(int[] a) {
    buildHeap(a);                               // max-heap version
    for (int end = a.length - 1; end > 0; end--) {
        int t = a[0]; a[0] = a[end]; a[end] = t;
        siftDown(a, 0, end);                    // note: n is now 'end'
    }
}

// Min heap -> max heap is just buildHeap with the comparison flipped: O(n),
// no need to extract and reinsert everything.`,
    },
    recall: [
      "children 2i+1 and 2i+2, parent (i−1)/2 — write these down before anything else",
      "buildHeap starts at n/2 − 1, the last node that has a child, and is O(n)",
      "insert sifts up, extract sifts down; a heap is not sorted, only the root is guaranteed",
      "heap sort builds a max heap for ascending order, which feels backwards and is correct",
      "converting a min heap to a max heap is one O(n) buildHeap, not n inserts",
      "validating a heap is one pass checking a[i] <= a[2i+1] and a[2i+2] where they exist",
      "Java's PriorityQueue is a min heap; pass Comparator.reverseOrder() for a max heap",
    ],
    complexity: {
      time: "build O(n) · insert and extract O(log n) · heap sort O(n log n)",
      space: "O(1) in place",
      note: "Build is O(n) because most nodes sit near the leaves; the sum of all node heights is bounded by 2n.",
    },
    traps: [
      "sifting down from 0 to n instead of from n/2−1 down to 0, which is O(n log n) and may not even be correct",
      "parent as i/2 rather than (i−1)/2 in a 0-indexed array",
      "in heap sort, passing the original n to siftDown instead of the shrinking bound",
      "forgetting Java's PriorityQueue is a min heap by default",
    ],
    problems: [
      "heaps-theory",
      "heapify-algorithm",
      "build-heap-from-a-given-array",
      "implement-min-heap",
      "implement-max-heap",
      "step-11-heaps__min-heap-and-max-heap-implementation",
      "step-11-heaps__check-if-an-array-represents-a-min-heap-or-not",
      "step-11-heaps__convert-min-heap-to-max-heap",
      "heap-sort",
    ],
  },

  {
    id: "top-k",
    title: "Top K by heap",
    family: "heaps",
    aka: ["kth largest", "k closest", "running median", "streaming"],
    hook: "Keep a heap of size k with the wrong polarity, so the one you would discard is always on top.",
    cues: [
      "“k-th largest / smallest”, or the k closest, most frequent, best",
      "a stream, where the whole input is never in memory at once",
      "sorting the lot would be O(n log n) and you only need k",
    ],
    template: {
      java: `// k-th LARGEST with a MIN heap of size k — the counter-intuitive bit. The
// root is the smallest of the k best seen, so it is exactly what to evict.
int kthLargest(int[] a, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();      // min heap
    for (int x : a) {
        heap.add(x);
        if (heap.size() > k) heap.poll();                     // drop the smallest
    }
    return heap.peek();                                       // k-th largest
}

// In a STREAM the same object just stays alive between queries: add, evict if
// oversized, and peek is the current answer in O(1).

// RUNNING MEDIAN needs two heaps: a max heap for the lower half and a min heap
// for the upper half, rebalanced so their sizes differ by at most one. The
// median is the larger heap's root, or the mean of both roots when level.`,
      python: `import heapq

def kth_largest(a: list[int], k: int) -> int:
    heap: list[int] = []
    for x in a:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
        # or simply: heapq.nlargest(k, a)[-1]
    return heap[0]`,
    },
    recall: [
      "k-th largest wants a MIN heap of size k; k-th smallest wants a MAX heap. Getting this backwards is the standard mistake",
      "cap the heap at k and evict immediately, so memory is O(k) not O(n)",
      "Quickselect gives O(n) average for a one-off k-th largest, but a heap is the one that also handles a stream",
      "Python's heapq is min-only: negate the values for a max heap",
      "two heaps for a median, kept balanced to within one element",
      "most frequent k: count first, then run top-k over the counts",
    ],
    complexity: {
      time: "O(n log k)",
      space: "O(k)",
      note: "Better than O(n log n) whenever k is much smaller than n, which is the point.",
    },
    traps: [
      "using a max heap for k-th largest and then having to pop k−1 times",
      "letting the heap grow to n and losing the space advantage",
      "peeking before k elements have arrived",
      "in Python, forgetting that heapq has no max-heap mode",
    ],
    problems: [
      "step-11-heaps__kth-largest-element-in-an-array-use-priority-queue",
      "step-11-heaps__kth-largest-element-in-a-stream-of-running-integers",
      "step-11-heaps__maximum-sum-combination",
    ],
    borrows: [
      "step-14-binary-search-trees__find-k-th-smallest-largest-element-in-bst",
    ],
  },

  {
    id: "greedy-sort-take",
    title: "Sort, then take — the exchange argument",
    family: "greedy",
    aka: ["assign cookies", "fractional knapsack", "lemonade change", "greedy choice"],
    hook: "Sort by the right key and take in order; the proof is that swapping any pair never helps.",
    cues: [
      "a resource to hand out and the aim is to satisfy as many as possible",
      "a value-per-unit ratio, and fractions are allowed",
      "a local best choice that provably cannot hurt the future",
      "if items could not be split this would be DP — check that first",
    ],
    template: {
      java: `// Assign cookies: sort both, then two pointers. Give the smallest adequate
// cookie to the least demanding child — spending a bigger one is pure waste.
int assignCookies(int[] greed, int[] size) {
    Arrays.sort(greed);
    Arrays.sort(size);
    int child = 0, cookie = 0;
    while (child < greed.length && cookie < size.length) {
        if (size[cookie] >= greed[child]) child++;      // satisfied
        cookie++;                                       // used either way
    }
    return child;
}

// Fractional knapsack: sort by value/weight DESCENDING and take greedily,
// splitting the last item. This only works because fractions are allowed —
// with whole items it is 0/1 knapsack, which is DP.
double fractionalKnapsack(int[][] items, int cap) {     // {value, weight}
    Arrays.sort(items, (a, b) ->
        Double.compare((double) b[0] / b[1], (double) a[0] / a[1]));
    double total = 0;
    for (int[] it : items) {
        if (cap >= it[1]) { total += it[0]; cap -= it[1]; }
        else { total += (double) it[0] * cap / it[1]; break; }
    }
    return total;
}

// Lemonade change: always give back the LARGEST notes first, keeping small
// ones in reserve — they are the flexible ones.`,
    },
    recall: [
      "the sort key is the whole decision; write down why swapping two adjacent items cannot improve things",
      "fractional knapsack is greedy, 0/1 knapsack is DP — the single most important distinction here",
      "when making change, spend the big notes and hoard the flexible small ones",
      "compare ratios by cross-multiplying rather than dividing, to dodge floating point",
      "two sorted arrays plus two pointers is the usual shape once the sort is chosen",
    ],
    complexity: { time: "O(n log n), dominated by the sort", space: "O(1) beyond the sort" },
    traps: [
      "applying the fractional-knapsack ratio sort to a 0/1 problem, which is simply wrong",
      "sorting ascending when the argument needs descending",
      "floating-point ties in the ratio comparison",
      "advancing only the matched pointer in the two-pointer loop and looping forever",
    ],
    problems: [
      "step-12-greedy-algorithms__assign-cookies",
      "step-16-dynamic-programming__assign-cookies",
      "step-12-greedy-algorithms__lemonade-change",
      "step-12-greedy-algorithms__fractional-knapsack-problem",
    ],
  },

  {
    id: "interval-scheduling",
    title: "Interval scheduling — sort by END",
    family: "greedy",
    aka: ["n meetings in one room", "non-overlapping intervals", "job sequencing", "activity selection"],
    hook: "To fit the most intervals, always take the one that finishes earliest.",
    cues: [
      "“maximum number of meetings / activities / jobs that fit”",
      "“minimum number of intervals to remove so none overlap” — the same question inverted",
      "jobs with deadlines and profits, where only one runs at a time",
      "you are choosing a subset of intervals, not combining them",
    ],
    template: {
      java: `// Sort by FINISH time. Earliest finish leaves the most room for everything
// after it — that is the exchange argument, and sorting by start or by
// duration is simply wrong.
int maxMeetings(int[][] meetings) {              // {start, end}
    Arrays.sort(meetings, (a, b) -> Integer.compare(a[1], b[1]));
    int count = 0, lastEnd = Integer.MIN_VALUE;
    for (int[] m : meetings) {
        if (m[0] >= lastEnd) {                   // >= if touching is allowed
            count++;
            lastEnd = m[1];
        }
    }
    return count;
}

// "Minimum removals so none overlap" = n - maxMeetings. Same loop.

// JOB SEQUENCING with deadlines: sort by profit DESCENDING, then place each
// job in the latest free slot at or before its deadline. A DSU over slots
// makes "find the latest free slot <= d" near O(1); a boolean array scanning
// backwards is O(n · maxDeadline) and usually fine.`,
    },
    recall: [
      "sort by END time. Not start, not duration — and be ready to say why",
      "“remove the fewest to make them disjoint” is n minus the maximum you can keep",
      "whether touching endpoints count as overlapping changes >= to >; read the statement",
      "job sequencing sorts by profit descending and fills the latest possible slot, which keeps earlier slots free",
      "shortest-job-first is the same family: sorting by burst time minimises average waiting time",
    ],
    complexity: { time: "O(n log n)", space: "O(1), or O(maxDeadline) for job sequencing" },
    traps: [
      "sorting by start time, which looks reasonable and gives wrong answers",
      "getting the touching-endpoint comparison the wrong way round",
      "in job sequencing, filling the earliest free slot instead of the latest",
      "confusing this with interval merging, which sorts by start",
    ],
    problems: [
      "step-12-greedy-algorithms__n-meetings-in-one-room",
      "step-12-greedy-algorithms__non-overlapping-intervals",
      "step-12-greedy-algorithms__job-sequencing-problem",
      "shortest-job-first",
    ],
  },

  {
    id: "interval-merging",
    title: "Interval merging & sweep line — sort by START",
    family: "greedy",
    aka: ["merge intervals", "insert interval", "minimum platforms", "sweep line", "overlapping"],
    hook: "Sort by start and extend the current block; or split every interval into +1 and −1 events and sweep.",
    cues: [
      "“merge all overlapping intervals” or “insert this one and re-merge”",
      "“how many rooms / platforms / resources are needed at once” — the maximum overlap",
      "you are combining intervals rather than selecting a subset",
      "arrivals and departures that can be considered separately",
    ],
    template: {
      java: `// Merging: sort by START, then either extend the last block or start a new one.
int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> out = new ArrayList<>();
    for (int[] it : intervals) {
        int[] last = out.isEmpty() ? null : out.get(out.size() - 1);
        if (last != null && it[0] <= last[1]) {
            last[1] = Math.max(last[1], it[1]);   // max, NOT it[1]
        } else {
            out.add(new int[] { it[0], it[1] });
        }
    }
    return out.toArray(new int[0][]);
}

// SWEEP LINE for maximum overlap (minimum platforms): forget which interval is
// which. Sort the starts and the ends separately and walk both.
int minPlatforms(int[] arrive, int[] depart) {
    Arrays.sort(arrive);
    Arrays.sort(depart);
    int i = 0, j = 0, open = 0, best = 0;
    while (i < arrive.length) {
        if (arrive[i] <= depart[j]) {             // one more overlapping
            open++;
            i++;
            best = Math.max(best, open);
        } else {
            open--;                               // one freed up
            j++;
        }
    }
    return best;
}`,
    },
    recall: [
      "merging sorts by START; scheduling sorts by END. Two different problems that look alike",
      "extend with max(last.end, current.end) — a short interval nested inside a long one must not shrink it",
      "mutate the last block in place rather than popping and re-pushing",
      "maximum overlap does not need the pairings: sort starts and ends independently and sweep",
      "the sweep is the same as sorting (time, ±1) events and keeping a running sum",
      "insert interval can be done in one O(n) pass on already-sorted input: emit what ends before, merge what overlaps, emit the rest",
    ],
    complexity: { time: "O(n log n)", space: "O(n) for the output" },
    traps: [
      "assigning last.end = current.end instead of the max, which drops a nested interval's tail",
      "sorting by end time here, as if it were a scheduling problem",
      "off-by-one on whether a departure at exactly the arrival time frees the platform",
      "re-sorting in insert-interval when the input is already sorted",
    ],
    problems: [
      "step-12-greedy-algorithms__merge-intervals",
      "step-03-solve-problems-on-arrays__merge-overlapping-subintervals",
      "step-12-greedy-algorithms__insert-interval",
      "step-12-greedy-algorithms__minimum-number-of-platforms-required-for-a-railway",
    ],
  },

  {
    id: "greedy-reach",
    title: "Furthest reach",
    family: "greedy",
    aka: ["jump game", "jump game 2", "reachability", "greedy BFS"],
    hook: "Track the furthest index reachable so far; if the loop ever passes it, you are stuck.",
    cues: [
      "“can you reach the end”, with a jump length at each position",
      "“fewest jumps to the end” — the same scan, counting level boundaries",
      "a DP over positions that is O(n²) and should be O(n)",
    ],
    template: {
      java: `// Reachability: one pass, one variable.
boolean canReach(int[] a) {
    int furthest = 0;
    for (int i = 0; i < a.length; i++) {
        if (i > furthest) return false;             // this index is unreachable
        furthest = Math.max(furthest, i + a[i]);
    }
    return true;
}

// Fewest jumps: the same scan, but counting. 'end' is the boundary of the
// current jump's reach; crossing it means one more jump has been spent. This
// is BFS by level without a queue.
int minJumps(int[] a) {
    int jumps = 0, end = 0, furthest = 0;
    for (int i = 0; i < a.length - 1; i++) {        // note: a.length - 1
        furthest = Math.max(furthest, i + a[i]);
        if (i == end) {                             // must jump now
            jumps++;
            end = furthest;
        }
    }
    return jumps;
}`,
    },
    recall: [
      "one variable, furthest = max(furthest, i + a[i]), checked against i",
      "unreachable the moment i > furthest",
      "for fewest jumps the loop stops at n − 2: standing on the last index needs no jump out of it",
      "the two reach variables are a BFS frontier — 'end' is the current level's edge",
      "this is the O(n) replacement for an O(n²) DP, and it is worth recognising the DP first",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "looping to n − 1 on fewest jumps, which counts one jump too many",
      "comparing i against furthest after updating it rather than before",
      "forgetting that a 0 at the current position does not end things if an earlier jump already reached past it",
    ],
    problems: [
      "step-12-greedy-algorithms__jump-game",
      "step-12-greedy-algorithms__jump-game-2",
    ],
  },

  {
    id: "two-pass-greedy",
    title: "Two passes, one each way",
    family: "greedy",
    aka: ["candy", "valid parenthesis with wildcard", "left to right then right to left"],
    hook: "One constraint looks left, the other looks right — satisfy each in its own pass, then combine.",
    cues: [
      "two symmetric conditions that cannot both be satisfied in a single sweep",
      "“each child must get more than a lower-rated neighbour” — on both sides",
      "a wildcard that can be anything, so you track a *range* of possible counts",
      "a single pass keeps having to go back and fix earlier decisions",
    ],
    template: {
      java: `// Candy: the left-neighbour rule and the right-neighbour rule are symmetric.
// Satisfy each in its own direction, then take the max per position — that is
// the smallest value meeting both.
int candy(int[] rating) {
    int n = rating.length;
    int[] left = new int[n], right = new int[n];
    Arrays.fill(left, 1);
    Arrays.fill(right, 1);

    for (int i = 1; i < n; i++)
        if (rating[i] > rating[i - 1]) left[i] = left[i - 1] + 1;

    for (int i = n - 2; i >= 0; i--)
        if (rating[i] > rating[i + 1]) right[i] = right[i + 1] + 1;

    int total = 0;
    for (int i = 0; i < n; i++) total += Math.max(left[i], right[i]);
    return total;
}

// Valid parenthesis with '*' wildcards: carry the RANGE of possible open
// counts. lo assumes every '*' is ')', hi assumes every '*' is '('.
boolean checkValid(String s) {
    int lo = 0, hi = 0;
    for (char c : s.toCharArray()) {
        if (c == '(') { lo++; hi++; }
        else if (c == ')') { lo--; hi--; }
        else { lo--; hi++; }                 // '*' could be either
        if (hi < 0) return false;            // too many ')' even at best
        lo = Math.max(lo, 0);                // never go below zero
    }
    return lo == 0;                          // zero open is achievable
}`,
    },
    recall: [
      "two directions, one array each, then max per position — not a sum",
      "the left pass only reacts to a strictly greater rating; equal ratings reset to 1",
      "the two-pointer alternative to candy is O(1) space but far harder to get right under pressure",
      "for wildcards, carry a [lo, hi] range of open counts, clamp lo at 0, and fail when hi goes negative",
      "clamping lo at 0 encodes “some assignment of the wildcards keeps it valid so far”",
    ],
    complexity: { time: "O(n)", space: "O(n), or O(1) for the range version" },
    traps: [
      "summing the two passes instead of taking the maximum",
      "using >= in the passes, so equal neighbours keep escalating",
      "forgetting to clamp lo at 0, which makes a valid string look invalid",
      "checking lo < 0 as a failure instead of hi < 0",
    ],
    problems: [
      "step-12-greedy-algorithms__candy",
      "step-12-greedy-algorithms__valid-paranthesis-checker",
    ],
  },
];
