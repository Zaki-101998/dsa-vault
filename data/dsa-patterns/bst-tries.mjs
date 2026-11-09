// @ts-check
// Binary search trees (step 13) and tries (step 17).
//
// "Largest BST in Binary Tree" is deliberately NOT here — it is the bottom-up
// return-info technique, and lives in ./trees.mjs under that pattern.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "bst-descend",
    title: "Descending a BST",
    family: "bst",
    aka: ["search in BST", "floor in BST", "ceil in BST", "BST property"],
    hook: "At each node, the ordering tells you which single child can possibly hold the answer.",
    cues: [
      "a BST and a target, or the closest value above or below it",
      "O(h) expected, so only one path down the tree may be walked",
      "floor, ceil, or the nearest value — a search that keeps the best candidate",
    ],
    template: {
      java: `// Search: one child at a time, no recursion needed.
Node search(Node root, int target) {
    Node cur = root;
    while (cur != null && cur.val != target) {
        cur = target < cur.val ? cur.left : cur.right;
    }
    return cur;
}

// FLOOR — the largest value <= target. Same descent, keeping a candidate:
// exactly the keep-a-candidate shape from binary search on an array.
int floor(Node root, int target) {
    int ans = -1;
    for (Node cur = root; cur != null; ) {
        if (cur.val == target) return cur.val;
        if (cur.val < target) {
            ans = cur.val;            // a candidate — go right for a bigger one
            cur = cur.right;
        } else {
            cur = cur.left;
        }
    }
    return ans;
}
// CEIL is the mirror: record on cur.val > target and go left.

// INSERT: descend to the empty slot and attach. No restructuring.
Node insert(Node root, int val) {
    if (root == null) { Node n = new Node(); n.val = val; return n; }
    Node cur = root;
    while (true) {
        if (val < cur.val) {
            if (cur.left == null) { cur.left = make(val); return root; }
            cur = cur.left;
        } else {
            if (cur.right == null) { cur.right = make(val); return root; }
            cur = cur.right;
        }
    }
}

// DELETE — the one with cases. Zero or one child: splice the child in. Two
// children: replace the value with the inorder successor (leftmost of the
// right subtree) and delete that instead, which always has at most one child.`,
    },
    recall: [
      "one child per step; touching both means you have stopped using the BST property",
      "floor and ceil are the keep-a-candidate descent — the same shape as lower bound on an array",
      "delete has three cases, and the two-child case reduces to the one-child case via the inorder successor",
      "O(h), which is O(log n) balanced and O(n) on a degenerate tree — a BST gives no worst-case guarantee",
      "insert never needs to restructure; that is what AVL and red-black trees add",
    ],
    complexity: {
      time: "O(h) — O(log n) balanced, O(n) worst case",
      space: "O(1) iterative",
    },
    traps: [
      "recursing into both children, which turns O(h) into O(n)",
      "on delete with two children, swapping with the predecessor's subtree incorrectly and losing nodes",
      "returning the candidate without checking it was ever set",
      "assuming balance and claiming O(log n) worst case",
    ],
    problems: [
      "step-14-binary-search-trees__introduction-to-binary-search-tree",
      "step-14-binary-search-trees__search-in-a-binary-search-tree",
      "step-14-binary-search-trees__floor-in-a-binary-search-tree",
      "step-14-binary-search-trees__ceil-in-a-binary-search-tree",
      "step-14-binary-search-trees__insert-a-given-node-in-binary-search-tree",
      "step-14-binary-search-trees__delete-a-node-in-binary-search-tree",
    ],
  },

  {
    id: "bst-inorder",
    title: "A BST's inorder is sorted",
    family: "bst",
    aka: ["kth smallest in BST", "validate BST", "inorder successor", "BST iterator", "recover BST", "two sum in BST"],
    hook: "Walk inorder and you are walking a sorted array — every sorted-array trick applies.",
    cues: [
      "k-th smallest or largest in a BST",
      "“is this actually a valid BST?”",
      "the inorder successor or predecessor of a node",
      "an iterator with O(h) space, or two-sum inside a BST",
      "two nodes have been swapped and must be found",
    ],
    template: {
      java: `// K-th SMALLEST: inorder, counting. Stop as soon as you hit k — do not
// materialise the whole traversal.
int count = 0, answer = -1;
void kth(Node n, int k) {
    if (n == null || count >= k) return;
    kth(n.left, k);
    if (++count == k) { answer = n.val; return; }
    kth(n.right, k);
}
// K-th LARGEST is the same with right and left swapped.

// VALIDATE: a node must sit inside a RANGE inherited from its ancestors.
// Comparing only against the immediate children is the classic wrong answer —
// it accepts a tree where a deep left descendant exceeds a distant ancestor.
boolean isBst(Node n, long lo, long hi) {
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;
    return isBst(n.left, lo, n.val) && isBst(n.right, n.val, hi);
}
// Call with (root, Long.MIN_VALUE, Long.MAX_VALUE) — longs, because int
// values can legitimately BE Integer.MIN_VALUE.
// Equivalent: an inorder walk must be strictly increasing.

// BST ITERATOR: push the left spine, and next() pops, then pushes the left
// spine of the popped node's right child. O(h) space, amortised O(1) per call.
class BstIterator {
    private final Deque<Node> stack = new ArrayDeque<>();
    BstIterator(Node root) { pushLeft(root); }
    private void pushLeft(Node n) { for (; n != null; n = n.left) stack.push(n); }
    boolean hasNext() { return !stack.isEmpty(); }
    int next() {
        Node n = stack.pop();
        pushLeft(n.right);
        return n.val;
    }
}

// TWO SUM IN BST: one ascending iterator and one descending iterator, then
// the ordinary two-pointer convergence. O(h) space, no array needed.

// INORDER SUCCESSOR: descend, recording the last node whose value exceeded the
// target — the keep-a-candidate descent again, so it is O(h), not a traversal.

// RECOVER a BST with two nodes swapped: inorder and look for the violations.
// ADJACENT swap -> one violation. Non-adjacent -> two: take the FIRST
// violation's larger node and the SECOND violation's smaller node.`,
    },
    recall: [
      "inorder on a BST is sorted; that single fact solves most of this family",
      "validate with an inherited (lo, hi) RANGE, not by comparing with the immediate children",
      "use longs for the range bounds, since a node's value may be Integer.MIN_VALUE",
      "k-th smallest should stop at k, not build the whole traversal",
      "the iterator is the iterative inorder traversal, paused — push the left spine, pop, push the right child's left spine",
      "two-sum in a BST uses two iterators walking in opposite directions",
      "successor and predecessor are O(h) descents, not O(n) traversals",
      "recovering a swapped BST: one violation means adjacent, two means take the first's larger and the second's smaller",
    ],
    complexity: {
      time: "O(h) for descents, O(n) for the traversal-based ones",
      space: "O(h)",
    },
    traps: [
      "validating against children instead of an inherited range",
      "Integer.MIN_VALUE / MAX_VALUE as range sentinels when node values can equal them",
      "strict versus non-strict comparison when duplicates are allowed — decide from the statement",
      "building the full inorder list for k-th smallest",
      "on recover, taking the wrong node from the second violation",
    ],
    problems: [
      "step-14-binary-search-trees__find-k-th-smallest-largest-element-in-bst",
      "step-14-binary-search-trees__check-if-a-tree-is-a-bst-or-bt",
      "step-14-binary-search-trees__inorder-successor-predecessor-in-bst",
      "bst-iterator",
      "step-14-binary-search-trees__two-sum-in-bst-check-if-there-exists-a-pair-with-sum-k",
      "step-14-binary-search-trees__recover-bst-correct-bst-with-two-nodes-swapped",
    ],
    borrows: [
      "step-13-binary-trees__inorder-traversal-of-binary-tree",
    ],
  },

  {
    id: "bst-bounds",
    title: "Using the BST ordering structurally",
    family: "bst",
    aka: ["LCA in BST", "construct BST from preorder", "upper bound construction"],
    hook: "The ordering is a decision procedure: it tells you where the split is, or where a value must go.",
    cues: [
      "the LCA in a BST, where the ordering makes the general tree algorithm unnecessary",
      "building a BST from its preorder alone",
      "a question the ordering answers in one descent that would otherwise need a full traversal",
    ],
    template: {
      java: `// LCA in a BST: the split point is where the two targets stop agreeing about
// which way to go. No recursion into both children, no parent map — O(h).
Node lca(Node n, int p, int q) {
    while (n != null) {
        if (p < n.val && q < n.val) n = n.left;
        else if (p > n.val && q > n.val) n = n.right;
        else return n;                     // they diverge here
    }
    return null;
}

// CONSTRUCT FROM PREORDER: carry an upper bound. The next value belongs in
// this subtree only while it stays under the bound.
int at = 0;
Node build(int[] pre, int bound) {
    if (at == pre.length || pre[at] > bound) return null;
    Node n = new Node();
    n.val = pre[at++];
    n.left  = build(pre, n.val);           // left subtree capped by this node
    n.right = build(pre, bound);           // right inherits the outer cap
    return n;
}
// Called as build(pre, Integer.MAX_VALUE). O(n), one pass.
// The naive alternative — insert each value in turn — is O(n²) on sorted input.`,
    },
    recall: [
      "LCA in a BST is a single descent: go left while both targets are smaller, right while both are larger, and stop where they diverge",
      "preorder alone determines a BST, because the inorder is implied by sorting",
      "the upper-bound construction is one pass; repeated insertion is O(n²) on sorted input",
      "left inherits the current node as its bound, right inherits the bound that was passed in",
      "a shared index (a field or a holder) is what lets the two recursive calls consume the same array",
    ],
    complexity: {
      time: "O(h) for LCA, O(n) for the construction",
      space: "O(1) for LCA, O(h) for the construction",
    },
    traps: [
      "using the general binary-tree LCA on a BST and giving up the O(h) bound",
      "building by repeated insertion and hitting O(n²)",
      "passing the wrong bound to the right subtree",
      "a local index variable in the construction, so the two calls disagree about position",
    ],
    problems: [
      "step-14-binary-search-trees__lca-in-binary-search-tree",
      "step-14-binary-search-trees__construct-a-bst-from-a-preorder-traversal",
    ],
  },

  {
    id: "trie-core",
    title: "Trie — prefix tree",
    family: "tries",
    aka: ["trie", "prefix tree", "insert search startsWith", "longest word with all prefixes"],
    hook: "One node per character position, so a shared prefix is stored exactly once.",
    cues: [
      "many words, and queries about prefixes rather than whole words",
      "insert, search, and startsWith as an explicit interface",
      "autocomplete, or “is any word in the dictionary a prefix of this”",
      "counting how many words start with something, which needs a counter per node",
    ],
    template: {
      java: `class TrieNode {
    TrieNode[] next = new TrieNode[26];
    boolean isWord;
    int wordsBelow;      // for prefix counts
    int wordsHere;       // for deletion
}

class Trie {
    private final TrieNode root = new TrieNode();

    void insert(String word) {
        TrieNode cur = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (cur.next[i] == null) cur.next[i] = new TrieNode();
            cur = cur.next[i];
            cur.wordsBelow++;
        }
        cur.isWord = true;
        cur.wordsHere++;
    }

    // The only difference between search and startsWith is the last line.
    private TrieNode walk(String s) {
        TrieNode cur = root;
        for (char c : s.toCharArray()) {
            cur = cur.next[c - 'a'];
            if (cur == null) return null;
        }
        return cur;
    }

    boolean search(String word)      { TrieNode n = walk(word); return n != null && n.isWord; }
    boolean startsWith(String prefix) { return walk(prefix) != null; }
    int countWordsWithPrefix(String p) { TrieNode n = walk(p); return n == null ? 0 : n.wordsBelow; }

    // ERASE needs the counters: decrement on the way down, and a node whose
    // wordsBelow reaches 0 can be unlinked.
}

// LONGEST WORD WITH ALL PREFIXES: insert everything, then DFS from the root
// only through nodes marked isWord. The deepest such path is the answer —
// stopping at a non-word node is what enforces "all prefixes present".`,
    },
    recall: [
      "a node is a position, not a character: the character is the edge index",
      "isWord marks the end of a word; a node can be a prefix without being one",
      "search and startsWith differ only in whether isWord is checked",
      "counters (wordsBelow, wordsHere) are what make counting and deletion possible — add them when inserting, not later",
      "a 26-slot array is faster than a HashMap for lowercase; use a map for a large or unknown alphabet",
      "“all prefixes present” is a DFS restricted to isWord nodes",
      "space is O(total characters), which is the cost of the whole approach",
    ],
    complexity: {
      time: "O(length) per operation, independent of how many words are stored",
      space: "O(total characters × alphabet)",
    },
    traps: [
      "returning true from search for a prefix that is not a stored word",
      "forgetting the null check inside the walk and dereferencing a missing child",
      "adding the counters only after writing insert, then having to touch every path again",
      "assuming lowercase when the input has digits, uppercase or Unicode",
    ],
    problems: [
      "step-17-tries__implement-trie-insert-search-startswith",
      "trie-implementation-and-advanced-operations",
      "step-17-tries__longest-string-with-all-prefixes",
    ],
  },

  {
    id: "trie-substrings",
    title: "Counting distinct substrings with a trie",
    family: "tries",
    aka: ["number of distinct substrings", "suffix trie"],
    hook: "Every substring is a prefix of some suffix — insert all the suffixes and count the nodes.",
    cues: [
      "count the DISTINCT substrings of a string",
      "deduplication of substrings, where a set of strings would be O(n³) space",
      "a question about all substrings at once, not one at a time",
    ],
    template: {
      java: `// Insert every suffix. Each new node created is exactly one new distinct
// substring, because a path from the root IS a substring, and the trie
// deduplicates shared prefixes for free.
int distinctSubstrings(String s) {
    TrieNode root = new TrieNode();
    int nodes = 0;
    for (int i = 0; i < s.length(); i++) {
        TrieNode cur = root;
        for (int j = i; j < s.length(); j++) {
            int c = s.charAt(j) - 'a';
            if (cur.next[c] == null) {
                cur.next[c] = new TrieNode();
                nodes++;                      // one new distinct substring
            }
            cur = cur.next[c];
        }
    }
    return nodes + 1;                         // + 1 for the empty substring,
                                              // if the problem counts it
}`,
    },
    recall: [
      "every substring is a prefix of a suffix — that reframing is the whole insight",
      "the count is the number of trie nodes created, not the number of insertions",
      "decide whether the empty substring counts; it is the usual off-by-one here",
      "O(n²) time and nodes, which is fine for n in the low thousands and not beyond",
      "a suffix automaton or suffix array is the O(n) answer for large n, well past this sheet",
    ],
    complexity: {
      time: "O(n²)",
      space: "O(n² × alphabet)",
      note: "n = 10³ gives a million nodes, which is already heavy; this does not scale to 10⁵.",
    },
    traps: [
      "counting insertions rather than newly created nodes",
      "the empty-substring off-by-one",
      "attempting it at n = 10⁵, where O(n²) nodes will not fit",
    ],
    problems: ["step-17-tries__number-of-distinct-substrings-in-a-string"],
  },

  {
    id: "binary-trie-xor",
    title: "Binary trie — maximising XOR",
    family: "tries",
    aka: ["maximum XOR", "bit trie", "XOR of two numbers", "maximum xor with element"],
    hook: "Store numbers as 32-bit paths, then walk greedily towards the opposite bit at every level.",
    cues: [
      "maximise or minimise a XOR against a set of numbers",
      "“maximum XOR of two numbers in an array”",
      "a XOR query with a constraint, like “only elements at most M”",
      "the brute force is every pair, O(n²), and O(n · 32) is wanted",
    ],
    template: {
      java: `// A trie over bits, most significant first. Two children per node: 0 and 1.
class BitTrie {
    private final BitTrie[] next = new BitTrie[2];
    private static final int BITS = 31;      // 0..30 for non-negative ints

    void insert(int x) {
        BitTrie cur = this;
        for (int b = BITS - 1; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (cur.next[bit] == null) cur.next[bit] = new BitTrie();
            cur = cur.next[bit];
        }
    }

    // Greedy: at each bit, prefer the OPPOSITE one — a high bit set is worth
    // more than everything below it, so taking it is always right.
    int maxXor(int x) {
        BitTrie cur = this;
        int best = 0;
        for (int b = BITS - 1; b >= 0; b--) {
            int bit = (x >> b) & 1;
            int want = 1 - bit;
            if (cur.next[want] != null) {
                best |= (1 << b);
                cur = cur.next[want];
            } else {
                cur = cur.next[bit];         // forced
            }
        }
        return best;
    }
}

// MAXIMUM XOR OF TWO NUMBERS: insert each number, then query with it. One pass
// of inserts and queries is enough — the pair will be found from one side.
//
// MAXIMUM XOR WITH AN ELEMENT <= M: sort the array and sort the queries by
// their limit, then insert elements as the limit grows. Offline processing, so
// the trie only ever holds the elements currently allowed.`,
    },
    recall: [
      "most significant bit first — the greedy argument depends on it, since one high bit outweighs all lower ones",
      "at each level take the opposite bit if it exists; otherwise you are forced and gain nothing there",
      "31 bits for non-negative ints; negatives need all 32 and care with the sign",
      "the constrained version is offline: sort both the array and the queries, then grow the trie as the limit rises",
      "O(n · 32) is effectively O(n), which is the point against the O(n²) pair scan",
    ],
    complexity: {
      time: "O(n · 32) to build and to query",
      space: "O(n · 32) nodes",
    },
    traps: [
      "walking from the least significant bit, which breaks the greedy choice",
      "too few bits for the value range, silently truncating",
      "forgetting to fall back to the same bit when the opposite child is missing",
      "trying to answer the constrained version online instead of sorting the queries",
    ],
    problems: [
      "step-17-tries__maximum-xor-of-two-numbers-in-an-array",
      "step-17-tries__maximum-xor-with-an-element-from-array",
    ],
  },
];
