// @ts-check
// Beginner Problems — step 1, and the largest step in the sheet at 84 entries.
//
// A caveat worth stating: this is the one step where "pattern" is partly a
// fiction. Half of it is course material (what a computer is, how to pick a
// language, the STL tour) and 22 entries are pattern-printing exercises. There
// is no deep technique to recall for "Learn Java". So these group by what is
// actually being practised, and several are deliberately a reading list with
// one screen of orientation rather than a technique with a template.
//
// The genuinely reusable ones are digit extraction, the number-theory
// identities, frequency counting and the recursion drills — those carry their
// weight and are worth revising as patterns.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "programming-foundations",
    title: "Before the code — thinking and debugging",
    family: "foundations",
    aka: ["flowcharts", "pseudocode", "dry run", "edge cases", "how to think like a programmer"],
    hook: "The habits that decide whether you solve a problem at all: state it, dry-run it, name the edge cases.",
    cues: [
      "you are stuck not on syntax but on what the program should do",
      "code that works on the sample and fails on submission",
      "a solution written before the approach was settled",
    ],
    template: {
      java: `// There is no template here. The checklist, instead — run it before writing
// a line, on every problem in this sheet:
//
// 1. RESTATE the problem in one sentence, in your own words. If you cannot,
//    you do not understand it yet.
// 2. CONSTRAINTS. n up to 10**5 rules out O(n²). n up to 20 invites 2^n.
//    This single number usually names the technique before you think of one.
//       n <= 20          2^n or n!
//       n <= 500         O(n³)
//       n <= 5000        O(n²)
//       n <= 10**5       O(n log n)
//       n <= 10**8       O(n)
// 3. EXAMPLE by hand. Work the sample input on paper. Then invent one the
//    problem did not give you.
// 4. EDGE CASES, written down before coding: empty input, one element, all
//    equal, already sorted, reverse sorted, negatives, zero, overflow,
//    duplicates, the maximum allowed size.
// 5. BRUTE FORCE first, out loud. It is the correctness baseline, and the
//    optimisation usually appears while describing it.
// 6. DRY RUN the finished code on your own example, by hand, before running
//    it. Track every variable on paper for two or three iterations.
//
// When a submission fails, the cause is almost always one of:
//   an edge case from step 4, an off-by-one, integer overflow, or an
//   uninitialised / stale variable carried between test cases.`,
    },
    recall: [
      "the constraint on n tells you the intended complexity, and therefore usually the technique — read it first, every time",
      "write the edge cases down before coding, not after a failed submission",
      "state the brute force out loud; the optimisation tends to surface while you describe it",
      "dry-run on paper before running: two iterations by hand catches most off-by-ones",
      "when a loop is wrong, print the variables rather than re-reading the code",
      "reset every global or static between test cases — the classic multi-test-case bug",
    ],
    complexity: {
      time: "—",
      space: "—",
      note: "The one table worth memorising is the constraint-to-complexity mapping in the template.",
    },
    traps: [
      "writing code before stating the approach",
      "testing only the given sample",
      "ignoring the constraint on n and solving a different problem than the one that will fit",
      "forgetting to reset state between test cases",
    ],
    problems: [
      "breaking-the-myth",
      "programming-and-what-are-computers",
      "how-to-think-like-a-programmer",
      "flowcharts-and-pseudocode",
      "flowchart-problem-solving",
      "dry-runs-edge-cases-and-debugging",
      "programming-languages-and-choosing-a-path",
    ],
  },

  {
    id: "complexity-analysis",
    title: "Time & space complexity",
    family: "foundations",
    aka: ["big O", "time complexity", "space complexity", "amortised"],
    hook: "Count the operations as the input grows, and ignore everything that does not grow with it.",
    cues: [
      "“what is the complexity of this” — in an interview, always",
      "a solution that is correct and times out",
      "nested loops whose bounds depend on each other",
      "a recursion whose cost is not obvious from looking at it",
    ],
    template: {
      java: `// How to read a complexity off code:
//
//   one loop to n                       O(n)
//   nested loops, both to n             O(n²)
//   inner loop to i                     O(n²) — n(n+1)/2 is still quadratic
//   halving each step                   O(log n)
//   loop to n, halving inside           O(n log n)
//   two separate loops                  O(n + m), NOT O(n²)
//   recursion branching twice, depth n  O(2^n)
//
// AMORTISED is the one people get wrong. A dynamic array's push is O(1)
// amortised: most pushes are O(1), and the occasional doubling costs O(n), but
// spread over all the pushes it averages to O(1). The same argument makes a
// monotonic stack O(n) overall despite its inner while loop — each element is
// pushed once and popped at most once.
//
// SPACE counts what you allocate, plus the recursion stack. A recursion of
// depth n is O(n) space even with no arrays at all — which is why a skewed
// tree or a 10**5-long linked list overflows the stack.
//
// Dropping constants is not optional but it is not free either: O(n) with a
// factor of 26 and O(n) with a factor of 1 behave very differently at 10**7.`,
    },
    recall: [
      "an inner loop running to i is still O(n²), because n(n+1)/2 is quadratic",
      "separate loops add, nested loops multiply",
      "the recursion stack is space: depth n means O(n), even with no allocation",
      "amortised means averaged over a sequence of operations, not best-case",
      "a monotonic stack's inner while loop is O(n) overall — push once, pop at most once",
      "log in these bounds is base 2, and log(10⁹) is about 30",
      "constants are dropped in the notation but still matter in practice at 10⁷ operations",
    ],
    complexity: {
      time: "—",
      space: "—",
      note: "Rough budget: about 10⁸ simple operations per second. 10⁵ with O(n²) is 10¹⁰ — far too slow.",
    },
    traps: [
      "calling a triangular nested loop O(n log n)",
      "ignoring the recursion stack when claiming O(1) space",
      "treating amortised as if it were worst case — it is not, and some problems care",
      "forgetting that string concatenation in a loop is O(n²) in Java and Python",
    ],
    problems: ["theory-with-examples"],
  },

  {
    id: "language-and-libraries",
    title: "The language and its standard library",
    family: "foundations",
    aka: ["STL", "Java Collections", "Python libraries", "learn C++", "learn Java", "learn Python"],
    hook: "Know which container you reach for, and what it costs — that is most of the speed in practice.",
    cues: [
      "picking a container: list, set, map, deque, heap",
      "“which is faster” between two library calls",
      "reimplementing something the library already has",
      "a sort with a custom comparator",
    ],
    template: {
      java: `// The containers worth knowing by cost, not by name.
//
// JAVA
//   ArrayList        O(1) get, O(1) amortised add, O(n) insert in the middle
//   ArrayDeque       the stack AND the queue. Prefer it to Stack (synchronised)
//                    and to LinkedList (cache-hostile)
//   HashMap/HashSet  O(1) average; no ordering
//   TreeMap/TreeSet  O(log n), sorted, and gives floorKey / ceilingKey — often
//                    the reason to choose it
//   PriorityQueue    min heap by default; reverseOrder() for a max heap
//   Arrays.sort      dual-pivot quicksort for primitives (UNSTABLE),
//                    TimSort for objects (stable)
//
// Pitfalls that cost real time:
//   boxing — HashMap<Integer,Integer> is far slower than int[]
//   Integer == Integer compares references above 127
//   string + in a loop is O(n²); use StringBuilder
//   List.remove(int) removes by INDEX, List.remove(Object) by value
//
// C++ STL
//   vector, deque, stack, queue, priority_queue
//   map/set are ORDERED (red-black tree, O(log n));
//   unordered_map/set are hashed, O(1) average
//   lower_bound / upper_bound on a sorted vector — the binary-search bounds
//   sort is introsort (unstable); stable_sort exists separately
//
// PYTHON
//   list, dict, set, collections.deque (O(1) at both ends — a plain list is
//   O(n) at the front), collections.Counter, heapq (MIN heap only — negate
//   for a max heap), bisect (lower/upper bound), functools.lru_cache for
//   memoisation in one decorator`,
    },
    recall: [
      "ArrayDeque is both the stack and the queue in Java; Stack and LinkedList are the wrong defaults",
      "ordered map (TreeMap, std::map) versus hashed map (HashMap, unordered_map) — O(log n) with ordering, or O(1) without",
      "a hash map gives O(1) average, never worst case",
      "PriorityQueue and heapq are MIN heaps; negate or pass a reverse comparator for a max heap",
      "lower_bound / bisect_left is the library's lower bound — do not rewrite it",
      "boxing in Java and the interpreter overhead in Python are both large constant factors; an int[] beats a map",
      "Python needs collections.deque for a queue; list.pop(0) is O(n)",
      "functools.lru_cache turns a recursion into a memoised DP in one line",
    ],
    complexity: {
      time: "per the container — know O(1) average versus O(log n) for each",
      space: "O(n), with a much larger constant for boxed types",
    },
    traps: [
      "using a plain list as a queue in Python",
      "`==` on boxed Integers in Java",
      "assuming Arrays.sort is stable for primitives",
      "List.remove(int) when you meant to remove a value",
      "reimplementing lower_bound and getting the boundary wrong",
    ],
    problems: [
      "learn-cpp",
      "learn-java",
      "learn-python",
      "stl",
      "step-01-learn-the-basics__java-collections",
      "python-libraries-part-1",
      "python-libraries-part-2",
    ],
  },

  {
    id: "concept-primers",
    title: "First look at arrays, hashing, strings & maths",
    family: "foundations",
    aka: ["basic maths", "basic arrays", "basic hashing", "basic string"],
    hook: "The orientation lectures — each one is the shallow end of a family with its own patterns later.",
    cues: [
      "starting the sheet, before any of the real topics",
      "you want the one-paragraph version of a topic before its problems",
    ],
    template: {
      java: `// These four are primers rather than problems. What each one sets up, and
// where the real techniques live:
//
//   BASIC MATHS     digit extraction (n % 10, n / 10), and the number-theory
//                   identities. -> the digit-extraction and number-theory
//                   patterns in this family, then Maths for the sieve
//
//   BASIC ARRAYS    indexing, bounds, the single pass with a running answer.
//                   -> Arrays & matrices: one pass, two pointers, prefix sums
//
//   BASIC HASHING   frequency counting, and set membership in O(1).
//                   -> Hashing: frequency counting here, prefix sum + hash map
//                   there
//
//   BASIC STRINGS   strings are arrays of characters, and immutable in Java
//                   and Python. -> Strings, and the prefix function
//
// Nothing to memorise. Watch the videos, then go to the pattern the topic
// actually belongs to.`,
    },
    recall: [
      "digit extraction is n % 10 for the last digit and n / 10 to drop it — the two moves behind every basic-maths problem",
      "a frequency array beats a hash map whenever the value range is small and known",
      "strings are immutable in Java and Python, so every modification allocates",
      "each of these four has a full family of patterns later; this is only the orientation",
    ],
    complexity: { time: "—", space: "—" },
    traps: [
      "treating these as problems to grind rather than context to read once",
      "skipping them and then meeting the same idea cold inside a harder problem",
    ],
    problems: [
      "basic-maths",
      "basic-arrays-hashing-and-strings",
      "basic-hashing",
      "basic-string",
    ],
  },

  {
    id: "pattern-printing",
    title: "Pattern printing — nested loop control",
    family: "foundations",
    aka: ["pattern 1", "star patterns", "pyramid", "nested loops", "logic building"],
    hook: "Rows in the outer loop; work out each row's spaces and symbols as a formula in the row index.",
    cues: [
      "print a triangle, pyramid, diamond or hollow shape",
      "22 numbered exercises whose only purpose is loop control",
      "nested loops where the inner bound depends on the outer index",
    ],
    template: {
      java: `// Every one of these is the same four questions. Answer them in order and
// the code writes itself:
//   1. how many rows?
//   2. for row i, how many LEADING SPACES?
//   3. for row i, how many SYMBOLS?
//   4. is anything printed after the symbols?

// Right triangle: row i has i + 1 stars.
for (int i = 0; i < n; i++) {
    for (int j = 0; j <= i; j++) System.out.print("*");
    System.out.println();
}

// Pyramid: row i has (n - 1 - i) spaces and (2i + 1) stars. Those two
// formulas are the ones to recall — most shapes are a variation of them.
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n - 1 - i; j++) System.out.print(" ");
    for (int j = 0; j < 2 * i + 1; j++) System.out.print("*");
    System.out.println();
}

// Diamond: the pyramid, then the pyramid with i counted downwards.
// Hollow shapes: print a symbol only on the boundary —
//     if (i == 0 || i == n - 1 || j == 0 || j == n - 1)
// Number patterns: print the counter rather than a star; decide whether it
// resets per row or carries across rows.

// Derive the formula from the LAST row first — it is the widest and the
// easiest to count — then express the earlier rows relative to it.`,
    },
    recall: [
      "pyramid: n − 1 − i spaces, then 2i + 1 stars. Almost everything else is a variation",
      "count the last row first; it is the widest and the formula is easiest to see there",
      "a hollow shape prints only on the boundary: first or last row, first or last column",
      "println outside the inner loop, not inside it",
      "for a number pattern, decide explicitly whether the counter resets each row",
      "there is no technique here beyond index arithmetic; the value is loop fluency",
    ],
    complexity: { time: "O(n²) — the output is that big", space: "O(1)" },
    traps: [
      "println inside the inner loop",
      "off-by-one in the space count, shifting the whole shape",
      "<= versus < in the inner bound",
      "forgetting that a diamond's second half must not repeat the middle row",
    ],
    problems: [
      "easy-and-medium",
      "hard",
      "pattern-1",
      "pattern-2",
      "pattern-3",
      "pattern-4",
      "pattern-5",
      "pattern-6",
      "pattern-7",
      "pattern-8",
      "pattern-9",
      "pattern-10",
      "pattern-11",
      "pattern-12",
      "pattern-13",
      "pattern-14",
      "pattern-15",
      "pattern-16",
      "pattern-17",
      "pattern-18",
      "pattern-19",
      "pattern-20",
      "pattern-21",
      "pattern-22",
    ],
  },

  {
    id: "digit-extraction",
    title: "Peeling digits off a number",
    family: "foundations",
    aka: ["count digits", "reverse a number", "palindrome number", "armstrong", "sum of digits"],
    hook: "`n % 10` is the last digit and `n / 10` drops it — every digit problem is that loop.",
    cues: [
      "anything about the digits of a number rather than its value",
      "reverse it, count them, sum them, find the largest",
      "palindrome, Armstrong, or any digit-based property",
      "doing it without converting to a string",
    ],
    template: {
      java: `// The loop. Everything in this pattern is this with a different body.
while (n > 0) {
    int digit = n % 10;
    // ... use digit ...
    n /= 10;
}

// REVERSE a number — and the one place overflow really bites.
int reverse(int n) {
    int result = 0;
    while (n != 0) {                  // != 0, so negatives terminate
        int digit = n % 10;
        // Check BEFORE multiplying, not after: once it overflows the
        // information is gone.
        if (result > Integer.MAX_VALUE / 10 || result < Integer.MIN_VALUE / 10) return 0;
        result = result * 10 + digit;
        n /= 10;
    }
    return result;
}

// COUNT DIGITS without a loop: (int) Math.log10(n) + 1, for n > 0.

// PALINDROME NUMBER: reverse it and compare. A negative is never a
// palindrome, because of the sign.

// ARMSTRONG: the sum of each digit raised to the number of digits equals the
// number. So count the digits first, then run the loop again.

// SUM OF DIGITS, recursively — the base case is the interesting part:
//    int sum(int n) { return n == 0 ? 0 : n % 10 + sum(n / 10); }`,
    },
    recall: [
      "n % 10 for the last digit, n / 10 to drop it",
      "`while (n != 0)`, not `> 0`, when the input can be negative",
      "check for overflow before multiplying by 10, never after",
      "digit count without a loop is log10(n) + 1, and it is undefined at n = 0",
      "Armstrong needs two passes: count the digits, then sum the powers",
      "n = 0 is the case every one of these loops skips entirely — handle it explicitly",
      "in Java and C, % of a negative number keeps the sign; in Python it does not",
    ],
    complexity: { time: "O(number of digits) = O(log n)", space: "O(1)" },
    traps: [
      "n = 0, where the loop body never runs",
      "overflow when reversing a number near the int limit",
      "`while (n > 0)` on negative input, returning immediately",
      "assuming % behaves the same way on negatives across languages",
    ],
    problems: [
      "step-01-learn-the-basics__count-digits",
      "count-number-of-odd-digits-in-a-number",
      "step-01-learn-the-basics__reverse-a-number",
      "palindrome-number",
      "return-the-largest-digit-in-a-number",
      "check-if-the-number-if-armstrong",
      "sum-of-digits-in-a-given-number",
    ],
  },

  {
    id: "number-theory-basics",
    title: "Divisors, GCD & primality",
    family: "foundations",
    aka: ["GCD", "LCM", "Euclid", "divisors of a number", "check for prime", "perfect number"],
    hook: "Loop to the square root, not to n — divisors come in pairs, and that halves everything.",
    cues: [
      "all the divisors of a number, or whether it is prime",
      "GCD or LCM of two numbers",
      "a perfect number, which is the sum of its proper divisors",
      "an O(n) loop over possible divisors that should be O(sqrt(n))",
    ],
    template: {
      java: `// DIVISORS come in pairs (i, n/i), so one loop to sqrt(n) finds them all.
List<Integer> divisors(int n) {
    List<Integer> out = new ArrayList<>();
    for (int i = 1; (long) i * i <= n; i++) {
        if (n % i != 0) continue;
        out.add(i);
        if (i != n / i) out.add(n / i);     // the guard: a perfect square
    }
    return out;
}

// PRIME: the same bound. Nothing above sqrt(n) can be a factor unless
// something below it already was.
boolean isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; (long) i * i <= n; i++) if (n % i == 0) return false;
    return true;
}

// GCD by Euclid — the one to memorise. Each step replaces the pair with a
// strictly smaller one, and it converges in O(log(min(a,b))).
int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }

// LCM from GCD. Divide FIRST, then multiply, or a * b overflows.
long lcm(int a, int b) { return (long) a / gcd(a, b) * b; }

// PERFECT NUMBER: the sum of the proper divisors (excluding n itself) equals
// n. Use the divisor loop and subtract n at the end.`,
    },
    recall: [
      "divisors pair up as (i, n/i), so the loop runs to sqrt(n)",
      "guard `i != n / i` or a perfect square's square root is added twice",
      "`(long) i * i <= n` rather than `i <= Math.sqrt(n)` — no floating point, no overflow",
      "Euclid's gcd(a, b) = gcd(b, a % b), base case b == 0",
      "lcm = a / gcd * b, dividing first to avoid overflow",
      "1 is not prime, and 2 is the only even prime",
      "for many primality queries, sieve once instead — see the Maths family",
    ],
    complexity: {
      time: "O(sqrt(n)) for divisors and primality, O(log min(a,b)) for gcd",
      space: "O(1), plus the output for divisors",
    },
    traps: [
      "looping to n instead of sqrt(n)",
      "double-counting the square root of a perfect square",
      "i * i overflowing an int for large n",
      "a * b overflowing in the lcm before the division",
      "treating 1 as prime, or forgetting n < 2",
    ],
    problems: [
      "step-01-learn-the-basics__check-for-prime",
      "count-of-prime-numbers-till-n",
      "divisors-of-a-number",
      "check-for-perfect-number",
      "gcd-of-two-numbers",
      "lcm-of-two-numbers",
    ],
  },

  {
    id: "array-basics",
    title: "First passes over an array",
    family: "foundations",
    aka: ["sum of array", "reverse an array", "check if sorted", "count in array"],
    hook: "One loop, one accumulator — or two pointers swapping inwards.",
    cues: [
      "sum, count or check a property over the whole array",
      "reverse it in place",
      "is it sorted — which is a comparison of neighbours, not a sort",
    ],
    template: {
      java: `// Accumulate in one pass. Use long for a sum: 10**5 ints can overflow.
long sum(int[] a) {
    long total = 0;
    for (int x : a) total += x;
    return total;
}

// REVERSE in place: two pointers moving inwards. The loop stops at i < j, so
// the middle element of an odd-length array is correctly left alone.
void reverse(int[] a) {
    for (int i = 0, j = a.length - 1; i < j; i++, j--) {
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }
}

// SORTED check: compare each element with its neighbour. One pass, and it
// returns early — there is no reason to sort anything.
boolean isSorted(int[] a) {
    for (int i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false;
    return true;
}
// Note <: this allows equal neighbours, i.e. non-decreasing. For STRICTLY
// increasing use <=. Read which the problem wants.`,
    },
    recall: [
      "accumulate a sum in a long; int overflows well within the usual constraints",
      "reverse with two pointers and `i < j`, which leaves an odd middle element alone",
      "“is it sorted” compares neighbours in one pass — it never sorts",
      "non-decreasing versus strictly increasing is one comparison operator; read the statement",
      "an empty array and a single-element array are both trivially sorted",
      "Java's for-each is fine for reading but cannot write back to the array",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "int overflow on the sum",
      "`i <= j` in the reverse loop, swapping the middle element with itself harmlessly but then swapping past it",
      "the wrong comparison for strict versus non-strict sortedness",
      "trying to write to the array through a for-each variable",
    ],
    problems: [
      "sum-of-array-elements",
      "count-of-odd-numbers-in-array",
      "step-03-solve-problems-on-arrays__check-if-the-array-is-sorted",
      "step-01-learn-the-basics__reverse-an-array",
    ],
  },

  {
    id: "frequency-counting",
    title: "Frequency counting",
    family: "foundations",
    aka: ["highest occurring element", "second highest frequency", "mode", "counting map"],
    hook: "Count everything in one pass, then scan the counts — two passes, never a nested loop.",
    cues: [
      "the most or least frequent element",
      "the second highest frequency, with the ties question lurking",
      "counting first and deciding second",
      "an O(n²) nested count that should be O(n)",
    ],
    template: {
      java: `// Pass 1 counts, pass 2 picks. The second pass runs over the MAP, which is
// usually much smaller than the array.
int mostFrequent(int[] a) {
    Map<Integer, Integer> count = new HashMap<>();
    for (int x : a) count.merge(x, 1, Integer::sum);

    int best = a[0], bestCount = 0;
    for (Map.Entry<Integer, Integer> e : count.entrySet()) {
        // > not >=, so an earlier-inserted key wins a tie. If the problem
        // wants the smallest value on a tie, compare the keys explicitly.
        if (e.getValue() > bestCount) { bestCount = e.getValue(); best = e.getKey(); }
    }
    return best;
}

// SECOND HIGHEST FREQUENCY: the same two-variable shape as second-largest —
// update the best first, then the runner-up.
//   if (c > firstCount)       { secondCount = firstCount; firstCount = c; }
//   else if (c < firstCount && c > secondCount) secondCount = c;
// Note the 'c < firstCount' clause: whether two elements sharing the top
// frequency means there is no second highest is a decision the problem
// makes, not you.

// SUM OF HIGHEST AND LOWEST FREQUENCY: one pass over the counts tracking both
// extremes. Watch the case where all frequencies are equal.

// Bounded values? Use an int[] instead — no boxing, no hashing, much faster.`,
    },
    recall: [
      "two passes: count, then scan the counts. A nested loop is the O(n²) mistake",
      "scan the map, not the array, in the second pass",
      "for a second-highest frequency, update the best before the runner-up — same as second-largest",
      "decide the tie rule from the statement before writing the comparison",
      "map.merge(key, 1, Integer::sum) is the idiomatic Java increment",
      "an int[] beats a HashMap whenever the value range is small and known",
    ],
    complexity: { time: "O(n)", space: "O(distinct values)" },
    traps: [
      "counting inside a nested loop",
      "assigning the runner-up after overwriting the best",
      "ignoring the tie rule and getting a different valid answer than expected",
      "all frequencies equal, where there may be no second highest",
    ],
    problems: [
      "highest-occurring-element-in-an-array",
      "second-highest-occurring-element",
      "sum-of-highest-and-lowest-frequency",
    ],
  },

  {
    id: "string-basics",
    title: "String drills",
    family: "foundations",
    aka: ["palindrome check", "anagram", "longest common prefix", "isomorphic", "rotate string", "sort by frequency"],
    hook: "A string is an array of characters — reverse it, count it, or compare it position by position.",
    cues: [
      "palindrome, anagram, isomorphic, rotation",
      "the longest common prefix of several strings",
      "sort the characters by how often they appear",
      "a character-level comparison rather than a search",
    ],
    template: {
      java: `// PALINDROME: two pointers inwards.
boolean isPalindrome(String s) {
    for (int i = 0, j = s.length() - 1; i < j; i++, j--)
        if (s.charAt(i) != s.charAt(j)) return false;
    return true;
}

// ANAGRAM: equal length, then equal frequencies. O(n), where sorting both is
// O(n log n) — correct, and the slower answer.
boolean isAnagram(String a, String b) {
    if (a.length() != b.length()) return false;
    int[] freq = new int[26];
    for (int i = 0; i < a.length(); i++) {
        freq[a.charAt(i) - 'a']++;
        freq[b.charAt(i) - 'a']--;        // one pass, both strings
    }
    for (int f : freq) if (f != 0) return false;
    return true;
}

// LONGEST COMMON PREFIX: compare column by column across every string, and
// stop at the first disagreement or the first string that runs out.
String lcp(String[] words) {
    if (words.length == 0) return "";
    for (int i = 0; i < words[0].length(); i++) {
        char c = words[0].charAt(i);
        for (String w : words) {
            if (i == w.length() || w.charAt(i) != c) return words[0].substring(0, i);
        }
    }
    return words[0];
}
// Sorting the array and comparing only the first and last also works, and is
// a neat trick worth remembering.

// ROTATION: b is a rotation of a exactly when a.length() == b.length() and
// (a + a).contains(b). One line, and the length check is not optional.

// ISOMORPHIC: a consistent one-to-one character mapping. TWO maps are needed,
// one each way — a single map accepts "badc" as isomorphic to "baba".

// SORT BY FREQUENCY: count, then sort the distinct characters by count
// descending, then rebuild the string.`,
    },
    recall: [
      "anagram: check the lengths first, then one frequency array updated from both strings",
      "rotation is `(a + a).contains(b)` plus the equal-length check",
      "isomorphic needs a map in BOTH directions; one map is the classic wrong answer",
      "longest common prefix compares column by column, or sorts and compares the first and last",
      "charAt(i) − 'a' assumes lowercase only — check the alphabet in the statement",
      "Java strings are immutable, so build with StringBuilder, never += in a loop",
      "sorting is the acceptable O(n log n) answer to several of these; the frequency array is the O(n) one",
    ],
    complexity: {
      time: "O(n) for most, O(n log n) when sorting is involved",
      space: "O(1) for a fixed alphabet",
    },
    traps: [
      "an anagram check without the length comparison",
      "a single map for isomorphic strings",
      "forgetting the length check in the rotation trick, where a + a contains plenty of wrong-length substrings",
      "charAt(i) − 'a' on uppercase, digits or Unicode",
      "string concatenation in a loop",
    ],
    problems: [
      "reverse-a-string-ii",
      "step-01-learn-the-basics__check-palindrome",
      "step-05-strings__largest-odd-number-in-a-string",
      "step-05-strings__longest-common-prefix",
      "step-05-strings__isomorphic-string",
      "step-05-strings__check-whether-one-string-is-a-rotation-of-another",
      "step-05-strings__check-if-two-strings-are-anagram-of-each-other",
      "step-05-strings__sort-characters-by-frequency",
      "step-05-strings__remove-outermost-paranthesis",
    ],
  },

  {
    id: "recursion-drills",
    title: "Recursion drills — base case & one step",
    family: "foundations",
    aka: ["recursion theory", "factorial", "fibonacci", "sum of first n", "recursive reverse"],
    hook: "Write the base case first, then do exactly one step and hand the rest to the same function.",
    cues: [
      "“solve this recursively” on something you could easily loop",
      "factorial, Fibonacci, the sum of the first n numbers",
      "reverse an array or string recursively",
      "a first recursion, where the aim is the habit rather than the answer",
    ],
    template: {
      java: `// The shape. Base case, one step, recurse on the rest.
int sumTo(int n) {
    if (n == 0) return 0;              // base case FIRST, always
    return n + sumTo(n - 1);           // one step, then the rest
}

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);       // overflows int at 13!
}

// Reverse an array recursively: two indices moving inwards.
void reverse(int[] a, int i, int j) {
    if (i >= j) return;
    int t = a[i]; a[i] = a[j]; a[j] = t;
    reverse(a, i + 1, j - 1);
}

// Palindrome recursively: the same shape, returning a boolean.
boolean isPalindrome(String s, int i, int j) {
    if (i >= j) return true;
    if (s.charAt(i) != s.charAt(j)) return false;
    return isPalindrome(s, i + 1, j - 1);
}

// FIBONACCI is the cautionary one. This is O(2^n) — about 1.6^n calls —
// because it recomputes the same values endlessly:
int fib(int n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
// One array turns it into O(n). That step from naive recursion to memoisation
// is the whole of dynamic programming, and this is where you first meet it.

// PARAMETERISED versus FUNCTIONAL recursion:
//   functional    returns the answer            return n + sumTo(n - 1);
//   parameterised carries it in an argument     sumTo(n - 1, total + n);
// Both are fine. The parameterised form is the one that generalises to
// backtracking, where the carried state is the partial solution.`,
    },
    recall: [
      "base case first, then one step, then recurse — in that order, written in that order",
      "every recursion needs an argument that strictly moves towards the base case",
      "naive Fibonacci is exponential, and one array makes it linear — that is the bridge to DP",
      "functional recursion returns the answer; parameterised recursion carries it down. Backtracking needs the second",
      "Java's default stack overflows at roughly 10⁴ frames; Python's limit is 1000 by default",
      "factorial overflows int at 13! and long at 21!",
      "a recursion over an array usually needs an index argument, so add one rather than slicing — slicing copies",
    ],
    complexity: {
      time: "O(n) for a linear recursion, O(2^n) for naive Fibonacci",
      space: "O(depth) for the call stack, even with no allocation",
    },
    traps: [
      "a missing or unreachable base case — infinite recursion",
      "a base case written after the recursive step",
      "expecting naive Fibonacci to finish for n = 50",
      "slicing arrays or strings per call, making an O(n) recursion O(n²)",
      "stack overflow on large n where a loop would be fine",
    ],
    problems: [
      "recursion-theory",
      "recursion-concepts-with-parameters",
      "step-01-learn-the-basics__sum-of-first-n-numbers",
      "factorial-of-a-given-number-i",
      "factorial-of-a-given-number-ii",
      "sum-of-array-elements-ii",
      "reverse-a-string-i",
      "step-01-learn-the-basics__check-if-a-string-is-palindrome-or-not",
      "step-08-bit-manipulation__check-if-a-number-is-odd-or-not",
      "reverse-an-array-ii",
      "check-if-the-array-is-sorted-ii",
      "step-01-learn-the-basics__fibonacci-number",
    ],
  },
];
