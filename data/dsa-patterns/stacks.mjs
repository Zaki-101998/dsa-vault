// @ts-check
// Stacks and queues — step 11, and the clearest case of the sheet's grouping
// hiding the technique. Striver's "FAQs" subsection holds Trapping Rainwater,
// Largest Rectangle, Stock Span, Sliding Window Maximum, Min Stack, LRU and
// LFU Cache and the Celebrity Problem: four unrelated methods under one
// heading. Here they separate into monotonic stack, span/histogram, monotonic
// deque, data-structure design and elimination.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "stack-queue-implementation",
    title: "Implementing stacks & queues",
    family: "stacks",
    aka: ["implement stack", "implement queue", "circular queue", "stack using queue"],
    hook: "Build both from an array, a linked list, and each other — then never think about it again.",
    cues: [
      "“implement X using Y” — the interview warm-up",
      "a circular buffer, or a queue that must not waste the space it dequeued",
      "you need to know which end is cheap on the structure you were handed",
    ],
    template: {
      java: `// Stack on an array: one index, pointing past the top.
class ArrayStack {
    private final int[] a;
    private int top = 0;
    ArrayStack(int cap) { a = new int[cap]; }
    void push(int x) { a[top++] = x; }
    int pop() { return a[--top]; }
    int peek() { return a[top - 1]; }
    boolean isEmpty() { return top == 0; }
}

// Queue on an array: CIRCULAR, or the space before 'front' is lost forever.
class ArrayQueue {
    private final int[] a;
    private int front = 0, size = 0;
    ArrayQueue(int cap) { a = new int[cap]; }
    void push(int x) { a[(front + size) % a.length] = x; size++; }
    int pop() { int x = a[front]; front = (front + 1) % a.length; size--; return x; }
}

// Queue from two stacks, amortised O(1): push onto 'in'; when 'out' is empty,
// tip the whole of 'in' into it. Each element moves across at most once.
class QueueFromStacks {
    private final Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    void push(int x) { in.push(x); }
    int pop() {
        if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop());
        return out.pop();
    }
}

// Stack from one queue: after pushing, rotate the queue so the new element is
// at the front. O(n) per push, and there is no amortised trick here.
//    q.add(x); for (int i = 0; i < q.size() - 1; i++) q.add(q.poll());`,
    },
    recall: [
      "an array queue must be circular — the modulo is the whole point",
      "queue from two stacks is amortised O(1): only refill `out` when it is empty, never on every pop",
      "stack from a queue is O(n) per push and there is no way to amortise it; the reverse direction is the clever one",
      "in Java use ArrayDeque, not the legacy Stack class (synchronised) or LinkedList",
      "a linked-list stack pushes and pops at the head; a linked-list queue needs a tail pointer too",
      "always decide what pop on an empty structure should do before writing it",
    ],
    complexity: {
      time: "O(1) for all operations, except stack-from-one-queue push at O(n)",
      space: "O(n)",
    },
    traps: [
      "a non-circular array queue, which runs out of room while half-empty",
      "refilling the output stack on every pop, turning amortised O(1) into O(n)",
      "off-by-one between `top` as the top index and `top` as the next free slot — pick one",
      "no underflow guard on pop/peek",
    ],
    problems: [
      "implementation-using-different-ds",
      "step-09-stack-and-queues__implement-stack-using-arrays",
      "step-09-stack-and-queues__implement-queue-using-arrays",
      "step-09-stack-and-queues__implement-stack-using-linkedlist",
      "step-09-stack-and-queues__implement-queue-using-linkedlist",
      "step-09-stack-and-queues__implement-queue-using-stack",
      "step-09-stack-and-queues__implement-stack-using-queue",
    ],
  },

  {
    id: "bracket-matching",
    title: "Bracket matching",
    family: "stacks",
    aka: ["balanced parenthesis", "valid brackets", "expression validity"],
    hook: "Push every opener, and make every closer match the most recent one.",
    cues: [
      "brackets, tags or quotes that must nest correctly",
      "“is this expression valid” with more than one kind of bracket",
      "the most recent unclosed thing is what matters — that is a stack",
    ],
    template: {
      java: `boolean balanced(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push(c);
        } else {
            if (stack.isEmpty()) return false;        // closer with nothing open
            char open = stack.pop();
            if (c == ')' && open != '(') return false;
            if (c == ']' && open != '[') return false;
            if (c == '}' && open != '{') return false;
        }
    }
    return stack.isEmpty();                           // nothing left unclosed
}`,
    },
    recall: [
      "two failure modes, and both must be checked: a closer with an empty stack, and a non-empty stack at the end",
      "with only one kind of bracket a counter is enough; more than one needs the stack",
      "pushing the *expected closer* instead of the opener makes the comparison a single equality",
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    traps: [
      "returning true without checking the stack is empty at the end",
      "popping an empty stack on a leading closer",
      "using a counter for multiple bracket types, which accepts \"([)]\"",
    ],
    problems: ["step-09-stack-and-queues__check-for-balanced-paranthesis"],
  },

  {
    id: "monotonic-stack",
    title: "Monotonic stack — next greater / smaller",
    family: "stacks",
    aka: ["next greater element", "previous smaller element", "monotonic", "stock span"],
    hook: "Keep the stack sorted: whatever the incoming element knocks off, it is that element's answer.",
    cues: [
      "“next / previous greater or smaller element” in any wording",
      "“how many days until a warmer day”, “how far back was the last higher price”",
      "an O(n²) scan looking left or right from each element for the first bigger one",
      "the contribution of each element as the minimum or maximum of a subarray",
      "things colliding and annihilating, where only the survivors matter",
    ],
    template: {
      java: `// Next greater to the RIGHT. Walk right to left; keep the stack
// decreasing, so its top is always the nearest taller element seen so far.
int[] nextGreater(int[] a) {
    int n = a.length;
    int[] ans = new int[n];
    Deque<Integer> stack = new ArrayDeque<>();        // holds VALUES here
    for (int i = n - 1; i >= 0; i--) {
        while (!stack.isEmpty() && stack.peek() <= a[i]) stack.pop();
        ans[i] = stack.isEmpty() ? -1 : stack.peek();
        stack.push(a[i]);
    }
    return ans;
}

// Left to right instead, holding INDICES: the element being popped has just
// found its answer. Prefer this shape when you need the distance, not the value.
int[] daysUntilWarmer(int[] a) {
    int[] ans = new int[a.length];
    Deque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < a.length; i++) {
        while (!stack.isEmpty() && a[stack.peek()] < a[i]) {
            int j = stack.pop();
            ans[j] = i - j;                           // j's answer is i
        }
        stack.push(i);
    }
    return ans;
}

// CIRCULAR (next greater II): run the loop twice over 2n, taking i % n, and
// only write an answer on the first pass.
//
// SUM OF SUBARRAY MINIMUMS: a[i] is the minimum of
//     (i - prevSmaller(i)) * (nextSmaller(i) - i)
// subarrays, so the total is the sum of a[i] times that count. Break the tie
// strictly on one side and loosely on the other (< one way, <= the other), or
// equal elements are counted twice.
// SUM OF SUBARRAY RANGES = that sum for maximums minus the sum for minimums.`,
    },
    recall: [
      "decide three things before writing it: direction of travel, strict or non-strict comparison, and values or indices on the stack",
      "the popped element is the one that just got its answer — that is the left-to-right shape",
      "circular means two passes over 2n with i % n, writing answers only on the first",
      "“count the subarrays where a[i] is the minimum” = (i − prevSmaller) × (nextSmaller − i)",
      "for that count, make one side strict and the other non-strict so duplicates are not double-counted",
      "Remove K Digits is the same stack: pop a larger digit while you still have removals left, and it leaves the smallest number",
      "sum the contributions into a long and apply the modulus as you go",
    ],
    complexity: {
      time: "O(n)",
      space: "O(n)",
      note: "Each index is pushed once and popped at most once, which is the whole amortised argument.",
    },
    traps: [
      "<= versus < with duplicates: on the subarray-count problems this silently double-counts",
      "pushing values when you need a distance, or indices when you need a value",
      "on Remove K Digits, forgetting to drop any leftover removals from the end and to strip leading zeros",
      "overflow on the contribution sums",
      "a circular pass that writes answers on both passes and overwrites the right one",
    ],
    problems: [
      "step-09-stack-and-queues__next-greater-element",
      "step-09-stack-and-queues__next-greater-element-2",
      "step-09-stack-and-queues__stock-span-problem",
      "step-09-stack-and-queues__asteroid-collision",
      "step-09-stack-and-queues__remove-k-digits",
      "step-09-stack-and-queues__sum-of-subarray-minimum",
      "step-09-stack-and-queues__sum-of-subarray-ranges",
    ],
  },

  {
    id: "span-and-histogram",
    title: "How far can it stretch — spans & histograms",
    family: "stacks",
    aka: ["largest rectangle in histogram", "trapping rainwater", "maximal rectangle", "previous smaller"],
    hook: "For each bar, find the first shorter one to its left and right — the gap between them is how far it stretches.",
    cues: [
      "“largest rectangle” under a histogram, or of 1s in a binary matrix",
      "water trapped between bars",
      "an answer built per-element from how far it can extend before something blocks it",
      "a 2-D problem that becomes the 1-D one once you build a heights array per row",
    ],
    template: {
      java: `// Largest rectangle: each bar's rectangle runs from the first shorter bar on
// its left to the first shorter bar on its right. One monotonic pass finds
// both — when a bar is popped, the current index is its right boundary and the
// new stack top is its left one.
int largestRectangle(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();        // increasing heights
    int best = 0;
    for (int i = 0; i <= heights.length; i++) {
        // A virtual 0-height bar past the end flushes whatever is left.
        int h = i == heights.length ? 0 : heights[i];
        while (!stack.isEmpty() && heights[stack.peek()] >= h) {
            int height = heights[stack.pop()];
            int left = stack.isEmpty() ? -1 : stack.peek();
            best = Math.max(best, height * (i - left - 1));
        }
        stack.push(i);
    }
    return best;
}

// MAXIMAL RECTANGLE of 1s: for each row keep a heights[] of how many
// consecutive 1s end at that row, and run the above on every row.
//    heights[c] = grid[r][c] == '1' ? heights[c] + 1 : 0;

// TRAPPING RAINWATER: the water above bar i is
//     min(tallest to its left, tallest to its right) - height[i]
// Two pointers compute it in O(1) space: move whichever side is shorter,
// because that side's own max is the binding constraint.
int trap(int[] h) {
    int left = 0, right = h.length - 1, maxL = 0, maxR = 0, total = 0;
    while (left < right) {
        if (h[left] <= h[right]) {
            maxL = Math.max(maxL, h[left]);
            total += maxL - h[left];
            left++;
        } else {
            maxR = Math.max(maxR, h[right]);
            total += maxR - h[right];
            right--;
        }
    }
    return total;
}`,
    },
    recall: [
      "width = rightBoundary − leftBoundary − 1, with the boundaries being the first *shorter* bars, not the last taller ones",
      "the sentinel pass at i == n (a virtual zero bar) is what flushes the stack; without it the tallest bars never get measured",
      "when a bar is popped, the current i is its right boundary and the new stack top is its left",
      "maximal rectangle = the histogram solution run once per row over a running heights array",
      "trapping rainwater needs min(maxLeft, maxRight) − height, and the two-pointer version moves the shorter side because that side is the constraint",
      "prefix-max and suffix-max arrays also solve rainwater in O(n) time and O(n) space — a fine first answer before the two-pointer one",
    ],
    complexity: {
      time: "O(n) for the histogram, O(rows · cols) for the matrix",
      space: "O(n)",
    },
    traps: [
      "forgetting the sentinel flush at the end",
      "using the last taller bar as the boundary rather than the first shorter one, which is off by one",
      "height * width overflowing an int on large inputs",
      "in the matrix version, failing to reset a column's height to 0 on a '0' cell",
      "in rainwater, moving the taller side, which breaks the constraint argument",
    ],
    problems: [
      "step-09-stack-and-queues__trapping-rainwater",
      "step-09-stack-and-queues__largest-rectangle-in-a-histogram",
      "step-09-stack-and-queues__maximal-rectangles",
      "step-16-dynamic-programming__maximum-rectangle-area-with-all-1-s-dp-55",
    ],
  },

  {
    id: "monotonic-deque",
    title: "Monotonic deque — window extremes",
    family: "stacks",
    aka: ["sliding window maximum", "deque", "monotonic queue"],
    hook: "A deque that drops anything a newer, bigger element makes useless — its front is the window's maximum.",
    cues: [
      "the maximum or minimum of every window of size k",
      "a window where you need an extreme, and a heap's O(log k) removal of a *specific* element is awkward",
      "an element that is both older and smaller than a newer one can never be the answer again",
    ],
    template: {
      java: `// Holds indices, values decreasing front to back. Front is the window max.
int[] windowMaximum(int[] a, int k) {
    Deque<Integer> dq = new ArrayDeque<>();
    int[] ans = new int[a.length - k + 1];
    for (int i = 0; i < a.length; i++) {
        // 1. drop the index that has fallen out of the window
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();
        // 2. drop everything smaller than the incoming value — older AND
        //    smaller means it can never be a maximum again
        while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();
        dq.addLast(i);
        // 3. once the first full window exists, the front is its answer
        if (i >= k - 1) ans[i - k + 1] = a[dq.peekFirst()];
    }
    return ans;
}`,
    },
    recall: [
      "store indices, not values, so the expiry check at the front is possible",
      "three steps in order: expire the front, pop the smaller ones at the back, push",
      "the deque is decreasing for a maximum and increasing for a minimum",
      "start writing answers at i >= k − 1, when the first window is complete",
      "O(n), not O(n log k): each index enters and leaves once",
      "a max-heap also works at O(n log n) and is easier to get right under pressure — but it needs lazy deletion",
    ],
    complexity: { time: "O(n)", space: "O(k)" },
    traps: [
      "storing values and then being unable to tell which one expired",
      "expiring by value rather than by index",
      "using the stack from the previous pattern — this needs both ends, so ArrayDeque used as a deque",
      "writing an answer before the first window is full",
    ],
    problems: ["step-09-stack-and-queues__sliding-window-maximum"],
  },

  {
    id: "ds-design",
    title: "Designing a data structure to a contract",
    family: "stacks",
    aka: ["LRU cache", "LFU cache", "min stack", "O(1) design", "hashmap plus linked list"],
    hook: "Every operation must be O(1), so pick two structures and keep them pointing at each other.",
    cues: [
      "“design a structure supporting get and put in O(1)”",
      "an eviction policy: least recently used, least frequently used",
      "an extra query on a stack — the minimum — that must not cost a scan",
      "a hash map alone cannot do it, because you also need an *order*",
    ],
    template: {
      java: `// MIN STACK: store the running minimum alongside each element, so popping
// restores the previous minimum for free. O(1) everywhere, O(n) extra space.
class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>();   // {value, minSoFar}
    void push(int x) {
        int min = stack.isEmpty() ? x : Math.min(x, stack.peek()[1]);
        stack.push(new int[] { x, min });
    }
    void pop() { stack.pop(); }
    int top() { return stack.peek()[0]; }
    int getMin() { return stack.peek()[1]; }
}

// LRU: HashMap for O(1) lookup, doubly linked list for O(1) reordering. The
// map stores NODES, so a hit can unlink and re-append without walking.
// Dummy head and tail nodes remove every null check.
class LRUCache {
    class Node { int key, val; Node prev, next; }
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(), tail = new Node();
    private final int cap;

    LRUCache(int cap) { this.cap = cap; head.next = tail; tail.prev = head; }

    private void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) {
        n.next = head.next; n.prev = head;
        head.next.prev = n; head.next = n;
    }

    int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        remove(n); addFront(n);                // touching it makes it newest
        return n.val;
    }

    void put(int key, int val) {
        Node n = map.get(key);
        if (n != null) { n.val = val; remove(n); addFront(n); return; }
        if (map.size() == cap) {
            Node lru = tail.prev;              // oldest
            remove(lru);
            map.remove(lru.key);               // remove from BOTH structures
        }
        Node fresh = new Node();
        fresh.key = key; fresh.val = val;
        map.put(key, fresh);
        addFront(fresh);
    }
}

// LFU: the same idea with one more level — a map from frequency to its own LRU
// list, plus a running minimum frequency. On a hit, move the node from list f
// to list f+1; evict from the minFreq list's tail.`,
    },
    recall: [
      "hash map for lookup, linked list for order — and the map must store the node, not the value, or you lose O(1) unlinking",
      "dummy head and tail nodes eliminate every edge case in the pointer surgery",
      "on eviction remove the key from both structures; forgetting the map is the classic leak",
      "the node must carry its own key, so that eviction can find the map entry to delete",
      "LFU = LRU per frequency bucket, plus minFreq, which only ever increases by 1 on a hit or resets to 1 on an insert",
      "min stack's trick is storing the answer with the data, not recomputing it",
    ],
    complexity: {
      time: "O(1) amortised for every operation",
      space: "O(capacity)",
    },
    traps: [
      "evicting from the list but leaving the key in the map",
      "a node with no key field, making eviction impossible in O(1)",
      "updating an existing key on put without also moving it to the front",
      "in LFU, failing to reset minFreq to 1 on an insert",
      "capacity 0, which must accept nothing",
    ],
    problems: [
      "step-09-stack-and-queues__implement-min-stack",
      "step-09-stack-and-queues__lru-cache-important",
      "step-09-stack-and-queues__lfu-cache",
    ],
  },

  {
    id: "elimination",
    title: "Elimination by pairing",
    family: "stacks",
    aka: ["celebrity problem", "candidate elimination", "majority candidate"],
    hook: "Compare two candidates and throw one away — n−1 comparisons leave one survivor to verify.",
    cues: [
      "“find the one person everybody knows, who knows nobody”",
      "a matrix of relations where the brute force is O(n²) and O(n) is asked for",
      "any single comparison can definitively rule *someone* out",
      "a candidate that must still be verified at the end",
    ],
    template: {
      java: `// Two pointers from the ends. Each comparison eliminates exactly one person:
//   if top knows bottom, top cannot be the celebrity (a celebrity knows nobody)
//   otherwise bottom cannot be (everyone must know the celebrity)
int celebrity(int[][] knows) {
    int top = 0, bottom = knows.length - 1;
    while (top < bottom) {
        if (knows[top][bottom] == 1) top++;
        else bottom--;
    }
    // One survivor — and it must still be checked, because elimination only
    // proves that nobody ELSE can be the answer.
    int c = top;
    for (int i = 0; i < knows.length; i++) {
        if (i == c) continue;
        if (knows[c][i] == 1 || knows[i][c] == 0) return -1;
    }
    return c;
}`,
    },
    recall: [
      "n − 1 comparisons to find the candidate, then one O(n) pass to verify",
      "the verification is not optional: elimination shows nobody else qualifies, not that the survivor does",
      "the same shape is Boyer-Moore majority voting — cancel pairs, then verify the survivor",
      "each comparison must rule someone out definitively, or the argument collapses",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "skipping the verification pass and returning a candidate when no celebrity exists",
      "checking only one direction during verification",
      "comparing the candidate against itself in the verification loop",
    ],
    problems: ["step-09-stack-and-queues__the-celebrity-problem"],
  },
];
