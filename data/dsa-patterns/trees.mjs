// @ts-check
// Binary trees — step 12, plus "Largest BST in Binary Tree", which the sheet
// files under BSTs but which is the bottom-up "return info from children"
// technique, not a BST property question. That cross-step move is the sort of
// thing Patterns view exists to show.
//
// Striver's "FAQs" subsection holds fourteen problems spanning five unrelated
// techniques — BFS views, root-to-node paths, treating the tree as an
// undirected graph, the complete-tree height trick, and threading. They
// separate here.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "tree-traversals",
    title: "Traversals, recursive and iterative",
    family: "trees",
    aka: ["inorder", "preorder", "postorder", "level order", "BFS on a tree", "iterative traversal"],
    hook: "Three depth-first orders differing only in where you visit, plus one breadth-first order using a queue.",
    cues: [
      "the warm-up before anything else on trees",
      "“do it iteratively” — which means an explicit stack, and postorder is the awkward one",
      "level by level, which is a queue and not recursion at all",
      "all three orders wanted from a single pass",
    ],
    template: {
      java: `class Node { int val; Node left, right; }

// The three DFS orders are one function with the visit moved.
void inorder(Node n, List<Integer> out) {
    if (n == null) return;
    inorder(n.left, out);
    out.add(n.val);            // preorder: before the left call
    inorder(n.right, out);     // postorder: after the right call
}

// Iterative INORDER: push the whole left spine, then pop-visit-go-right.
void inorderIter(Node root, List<Integer> out) {
    Deque<Node> stack = new ArrayDeque<>();
    Node cur = root;
    while (cur != null || !stack.isEmpty()) {
        while (cur != null) { stack.push(cur); cur = cur.left; }
        cur = stack.pop();
        out.add(cur.val);
        cur = cur.right;
    }
}

// Iterative PREORDER: trivial. Push right before left so left pops first.
void preorderIter(Node root, List<Integer> out) {
    if (root == null) return;
    Deque<Node> stack = new ArrayDeque<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        Node n = stack.pop();
        out.add(n.val);
        if (n.right != null) stack.push(n.right);
        if (n.left != null) stack.push(n.left);
    }
}

// Iterative POSTORDER, two stacks: it is preorder with the children pushed the
// other way (giving root-right-left), then reversed.
// One stack is possible but fiddly — remember the two-stack version.

// LEVEL ORDER: a queue, taking a whole level per outer iteration so you know
// where each level ends.
List<List<Integer>> levelOrder(Node root) {
    List<List<Integer>> out = new ArrayList<>();
    if (root == null) return out;
    Queue<Node> q = new ArrayDeque<>();
    q.add(root);
    while (!q.isEmpty()) {
        int size = q.size();                    // snapshot BEFORE adding
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            Node n = q.poll();
            level.add(n.val);
            if (n.left != null) q.add(n.left);
            if (n.right != null) q.add(n.right);
        }
        out.add(level);
    }
    return out;
}

// ALL THREE IN ONE PASS: push (node, state) pairs and advance the state.
// state 1 -> visit for preorder, push left;  2 -> visit for inorder, push
// right;  3 -> visit for postorder, pop.`,
    },
    recall: [
      "the three DFS orders are the same recursion with the visit moved; say the order out loud as left-root-right, root-left-right, left-right-root",
      "iterative inorder: push the left spine, pop, visit, go right",
      "iterative preorder pushes right then left, so left comes off first",
      "iterative postorder is easiest as preorder-mirrored-then-reversed, using two stacks",
      "level order snapshots q.size() before the inner loop — reading it inside the loop breaks as children are added",
      "a BST's inorder traversal is sorted; that is the single most useful fact in the next family",
      "one pass for all three orders carries a state number with each stacked node",
    ],
    complexity: {
      time: "O(n)",
      space: "O(h) for DFS, O(width) for BFS",
      note: "h is log n on a balanced tree and n on a degenerate one, which is what makes recursion risky at 10⁵ nodes.",
    },
    traps: [
      "calling q.size() inside the level loop after adding children",
      "pushing left before right in iterative preorder and getting the mirror order",
      "forgetting the null root check before the first push",
      "recursion depth on a skewed tree",
    ],
    problems: [
      "step-13-binary-trees__introduction-to-trees",
      "step-13-binary-trees__binary-tree-representation-in-java",
      "step-13-binary-trees__binary-tree-traversals-in-binary-tree",
      "step-13-binary-trees__inorder-traversal-of-binary-tree",
      "step-13-binary-trees__preorder-traversal-of-binary-tree",
      "step-13-binary-trees__post-order-traversal-of-binary-tree",
      "step-13-binary-trees__iterative-inorder-traversal-of-binary-tree",
      "step-13-binary-trees__iterative-preorder-traversal-of-binary-tree",
      "step-13-binary-trees__post-order-traversal-of-binary-tree-using-2-stack",
      "step-13-binary-trees__post-order-traversal-of-binary-tree-using-1-stack",
      "step-13-binary-trees__level-order-traversal-level-order-traversal-in-spiral-form",
      "step-13-binary-trees__preorder-inorder-and-postorder-traversal-in-one-traversal",
    ],
  },

  {
    id: "tree-bottom-up",
    title: "Bottom-up — return info from the children",
    family: "trees",
    aka: ["height of tree", "diameter", "balanced tree", "maximum path sum", "largest BST", "postorder dp"],
    hook: "Each call returns what the parent needs, while the real answer is updated on the way back up.",
    cues: [
      "a quantity about the whole tree, where the best answer may not pass through the root",
      "“diameter”, “maximum path sum”, “is it balanced” — all of them",
      "a naive version calls height() inside another recursion and is O(n²)",
      "the parent needs one thing (a height) and the answer needs another (a width) — so return the first and accumulate the second",
    ],
    template: {
      java: `// Height is the base case of the whole family.
int height(Node n) {
    if (n == null) return 0;
    return 1 + Math.max(height(n.left), height(n.right));
}

// DIAMETER in one pass. The trick: return the HEIGHT to the parent, but update
// the answer with the path THROUGH this node. Computing height separately
// inside a diameter recursion is the O(n²) version.
int best = 0;

int heightTracking(Node n) {
    if (n == null) return 0;
    int lh = heightTracking(n.left);
    int rh = heightTracking(n.right);
    best = Math.max(best, lh + rh);        // the path bending at n
    return 1 + Math.max(lh, rh);           // what the parent needs
}

// BALANCED: return -1 as a poison value so one unbalanced subtree aborts the
// whole thing, instead of checking height at every node.
int balancedHeight(Node n) {
    if (n == null) return 0;
    int lh = balancedHeight(n.left);
    if (lh == -1) return -1;
    int rh = balancedHeight(n.right);
    if (rh == -1) return -1;
    if (Math.abs(lh - rh) > 1) return -1;
    return 1 + Math.max(lh, rh);
}

// MAXIMUM PATH SUM: the same shape, but a negative subtree is better dropped,
// so clamp each child's contribution at 0.
int maxGain(Node n) {
    if (n == null) return 0;
    int l = Math.max(0, maxGain(n.left));
    int r = Math.max(0, maxGain(n.right));
    best = Math.max(best, n.val + l + r);
    return n.val + Math.max(l, r);
}

// LARGEST BST IN A BINARY TREE: return a small record per subtree —
// {min, max, size, isBst} — and combine. This is not a BST question, it is
// this pattern with a bigger return value.`,
    },
    recall: [
      "two different quantities: what the parent needs (returned) and what the answer needs (accumulated in a field or a holder)",
      "calling height() inside the recursion is the O(n²) mistake this pattern exists to avoid",
      "a poison return value (−1) propagates failure without a second traversal",
      "for path sums, clamp a child's contribution at 0: a negative branch is never worth taking",
      "the answer path bends at one node, so it uses BOTH children; the returned value uses only the better one",
      "when the parent needs several facts, return a small record rather than adding more global fields",
      "an int[] of length 1, or an instance field, is the usual way to carry the accumulator in Java",
    ],
    complexity: {
      time: "O(n) — one visit per node",
      space: "O(h)",
    },
    traps: [
      "returning the answer instead of what the parent needs, and vice versa",
      "recomputing height inside the recursion",
      "forgetting to clamp negative contributions on maximum path sum",
      "a diameter counted in nodes versus in edges — read which the problem wants",
      "on largest BST, combining children without checking the min/max boundaries",
    ],
    problems: [
      "step-13-binary-trees__height-of-a-binary-tree",
      "step-13-binary-trees__check-if-the-binary-tree-is-height-balanced-or-not",
      "step-13-binary-trees__diameter-of-binary-tree",
      "step-13-binary-trees__maximum-path-sum",
      "step-14-binary-search-trees__largest-bst-in-binary-tree",
    ],
  },

  {
    id: "tree-structural-compare",
    title: "Walking two subtrees in step",
    family: "trees",
    aka: ["identical trees", "symmetric tree", "mirror", "children sum property"],
    hook: "Recurse on two nodes at once, and decide which child pairs with which.",
    cues: [
      "“are these two trees identical”",
      "“is this tree a mirror of itself” — pair left with right, not left with left",
      "a local property every node must satisfy, checked top-down",
    ],
    template: {
      java: `// Identical: pair like with like.
boolean identical(Node a, Node b) {
    if (a == null || b == null) return a == b;     // both null => true
    return a.val == b.val
        && identical(a.left, b.left)
        && identical(a.right, b.right);
}

// Symmetric: the SAME function with the pairing crossed. That one change is
// the whole difference.
boolean mirror(Node a, Node b) {
    if (a == null || b == null) return a == b;
    return a.val == b.val
        && mirror(a.left, b.right)
        && mirror(a.right, b.left);
}
boolean isSymmetric(Node root) { return root == null || mirror(root.left, root.right); }

// CHILDREN SUM PROPERTY is top-down and local: every node equals the sum of
// its children. Checking it is one traversal; CONVERTING a tree to satisfy it
// is the interesting version — push the parent's value down on the way in,
// then fix the parent up from the children on the way out.`,
    },
    recall: [
      "`a == null || b == null` then `return a == b` handles all three null cases in one line",
      "symmetric is identical with left paired against right — nothing else changes",
      "a leaf has no children, so the children-sum property holds trivially; decide that before writing the check",
      "converting to satisfy children-sum needs both directions: push down, then fix up",
    ],
    complexity: { time: "O(n)", space: "O(h)" },
    traps: [
      "comparing left with left when checking symmetry",
      "returning false when both nodes are null",
      "treating a leaf as violating the children-sum property",
      "checking children-sum against only one child when the other is null",
    ],
    problems: [
      "step-13-binary-trees__check-if-two-trees-are-identical-or-not",
      "step-13-binary-trees__symmetric-binary-tree",
      "step-13-binary-trees__check-for-children-sum-property",
    ],
  },

  {
    id: "tree-views",
    title: "Views — BFS with a coordinate",
    family: "trees",
    aka: ["top view", "bottom view", "left view", "right view", "vertical order", "zig zag", "maximum width"],
    hook: "Walk level by level carrying a horizontal distance, and keep the first or last node seen per key.",
    cues: [
      "“top / bottom / left / right view of the tree”",
      "vertical order, where nodes in the same column group together",
      "zig-zag or spiral order",
      "maximum width, which needs each node's position within its level",
    ],
    template: {
      java: `// One idea covers every view: BFS carrying a horizontal distance (hd),
// left child hd-1, right child hd+1, then keep what the view asks for.
//
//   top view     -> FIRST node seen at each hd
//   bottom view  -> LAST node seen at each hd
//   left view    -> first node of each level
//   right view   -> last node of each level
//
// A TreeMap keeps the columns in left-to-right order for free.
List<Integer> topView(Node root) {
    Map<Integer, Integer> byColumn = new TreeMap<>();
    Queue<Node[]> q = new ArrayDeque<>();                 // we need hd too
    Map<Node, Integer> hd = new HashMap<>();
    if (root == null) return new ArrayList<>();
    q.add(new Node[] { root });
    hd.put(root, 0);
    while (!q.isEmpty()) {
        Node n = q.poll()[0];
        int d = hd.get(n);
        byColumn.putIfAbsent(d, n.val);                   // FIRST wins
        if (n.left != null)  { hd.put(n.left, d - 1);  q.add(new Node[] { n.left }); }
        if (n.right != null) { hd.put(n.right, d + 1); q.add(new Node[] { n.right }); }
    }
    return new ArrayList<>(byColumn.values());
}
// Bottom view: use put() instead of putIfAbsent, so the last one wins.

// VERTICAL ORDER keeps every node, and ties must break by level and then by
// value — so the structure is column -> level -> sorted multiset, and BFS
// order alone is not enough to be deterministic.

// ZIG ZAG: ordinary level order, reversing every other level (or using a
// deque and alternating which end you add to).

// MAXIMUM WIDTH: index each node as if the tree were complete — children of i
// are 2i+1 and 2i+2 — and a level's width is last index minus first plus one.
// Subtract the level's first index from each node's index, or 2i+2 overflows
// at about 32 levels.`,
    },
    recall: [
      "one BFS carrying a horizontal distance covers top, bottom, left, right and vertical",
      "top view keeps the first per column, bottom view the last — putIfAbsent versus put",
      "left and right views are the first and last node of each LEVEL, not of each column",
      "a TreeMap gives the columns in order without a separate sort",
      "vertical order needs column, then level, then value to be fully deterministic",
      "maximum width indexes nodes as a complete tree and must normalise per level to avoid overflow",
      "left and right views also fall out of a DFS that records the first node seen at each depth",
    ],
    complexity: {
      time: "O(n log n) with a TreeMap, O(n) with a plain map plus a min/max column",
      space: "O(n)",
    },
    traps: [
      "overflow on the width indices without per-level normalisation",
      "using put where putIfAbsent is meant, silently turning top view into bottom view",
      "confusing a column with a level",
      "on vertical order, relying on BFS order instead of sorting ties",
    ],
    problems: [
      "step-13-binary-trees__top-view-of-binary-tree",
      "step-13-binary-trees__bottom-view-of-binary-tree",
      "step-13-binary-trees__right-left-view-of-binary-tree",
      "step-13-binary-trees__vertical-order-traversal-of-binary-tree",
      "step-13-binary-trees__zig-zag-traversal-of-binary-tree",
      "step-13-binary-trees__boundary-traversal-of-binary-tree",
      "step-13-binary-trees__maximum-width-of-a-binary-tree",
    ],
  },

  {
    id: "tree-paths",
    title: "Root-to-node paths & LCA",
    family: "trees",
    aka: ["root to leaf path", "root to node path", "lowest common ancestor", "LCA in binary tree"],
    hook: "Carry the path down and undo it on the way out; the LCA is where two searches meet.",
    cues: [
      "“print all root-to-leaf paths”, or the path to one particular node",
      "lowest common ancestor in a tree with no ordering to exploit",
      "backtracking down a tree, where the list must be restored after each branch",
    ],
    template: {
      java: `// Path to a target: append, recurse, and REMOVE on the way out. That
// removal is what makes it correct for every other branch.
boolean pathTo(Node n, int target, List<Integer> path) {
    if (n == null) return false;
    path.add(n.val);
    if (n.val == target) return true;
    if (pathTo(n.left, target, path) || pathTo(n.right, target, path)) return true;
    path.remove(path.size() - 1);              // backtrack
    return false;
}
// Root-to-LEAF paths: the same walk, recording a copy of the list at every
// leaf. Record a COPY — the list keeps mutating.

// LCA without an ordering: return the node itself if it is p or q, otherwise
// ask both children. The node where both sides come back non-null is the LCA.
Node lca(Node n, Node p, Node q) {
    if (n == null || n == p || n == q) return n;
    Node l = lca(n.left, p, q);
    Node r = lca(n.right, p, q);
    if (l != null && r != null) return n;      // they split here
    return l != null ? l : r;                  // both in one subtree
}
// This assumes both nodes are present. If they might not be, find the
// candidate and then verify both exist beneath it.`,
    },
    recall: [
      "add, recurse, remove — the remove is the whole pattern, and forgetting it leaks state into sibling branches",
      "record a copy of the path at a leaf, never the live list",
      "LCA returns the node when both children report back non-null; otherwise it forwards whichever side found something",
      "the LCA recursion assumes both targets exist — verify separately if they might not",
      "the path-based LCA is the alternative: get both root-to-node paths and walk them to the last common entry",
    ],
    complexity: { time: "O(n)", space: "O(h)" },
    traps: [
      "forgetting to backtrack, so later branches inherit a stale path",
      "storing the live list reference at each leaf, leaving every entry identical and empty",
      "returning the wrong side when only one child found a target",
      "assuming both nodes exist when the problem does not guarantee it",
    ],
    problems: [
      "print-root-to-leaf-path-in-bt",
      "step-13-binary-trees__root-to-node-path-in-binary-tree",
      "step-13-binary-trees__lca-in-binary-tree",
    ],
    borrows: [
      "step-14-binary-search-trees__lca-in-binary-search-tree",
    ],
  },

  {
    id: "tree-as-graph",
    title: "Treating the tree as an undirected graph",
    family: "trees",
    aka: ["nodes at distance k", "burn the tree", "parent pointers", "BFS from a node"],
    hook: "Add parent links, and a tree becomes a graph where you can walk upwards too.",
    cues: [
      "“all nodes at distance K from a given node” — some of them are above it",
      "“how long until the whole tree burns from this node” — spreading in every direction",
      "distance measured from an arbitrary node, not from the root",
      "the recursion keeps wanting to go up, and tree nodes have no parent pointer",
    ],
    template: {
      java: `// Step 1 is always the same: one BFS or DFS to record every node's parent.
Map<Node, Node> parents(Node root) {
    Map<Node, Node> parent = new HashMap<>();
    Queue<Node> q = new ArrayDeque<>();
    q.add(root);
    parent.put(root, null);
    while (!q.isEmpty()) {
        Node n = q.poll();
        if (n.left != null)  { parent.put(n.left, n);  q.add(n.left); }
        if (n.right != null) { parent.put(n.right, n); q.add(n.right); }
    }
    return parent;
}

// Step 2: BFS outwards from the target over three neighbours — left, right and
// parent. Level K is the answer; the last level reached is the burn time.
List<Integer> atDistanceK(Node root, Node target, int k) {
    Map<Node, Node> parent = parents(root);
    Set<Node> seen = new HashSet<>();
    Queue<Node> q = new ArrayDeque<>();
    q.add(target);
    seen.add(target);
    int dist = 0;
    while (!q.isEmpty()) {
        if (dist == k) {
            List<Integer> out = new ArrayList<>();
            for (Node n : q) out.add(n.val);
            return out;
        }
        int size = q.size();
        for (int i = 0; i < size; i++) {
            Node n = q.poll();
            for (Node next : new Node[] { n.left, n.right, parent.get(n) }) {
                if (next != null && seen.add(next)) q.add(next);
            }
        }
        dist++;
    }
    return new ArrayList<>();
}
// Burn time = the number of levels this loop completes minus one.`,
    },
    recall: [
      "two phases: map the parents, then BFS from the target over three neighbours",
      "the visited set is essential — without it you walk straight back down the way you came",
      "level-by-level BFS gives the distance; the last completed level is the burn time",
      "the target may be given as a value rather than a reference, so you may need to find the node first",
      "this is the answer whenever a tree question measures distance from somewhere other than the root",
    ],
    complexity: { time: "O(n)", space: "O(n) for the parent map and visited set" },
    traps: [
      "omitting the visited set and revisiting the parent immediately",
      "off-by-one on the burn time: it is levels − 1, not levels",
      "forgetting that the parent of the root is null",
      "an identity-based set when nodes are compared by value, or vice versa",
    ],
    problems: [
      "step-13-binary-trees__print-all-the-nodes-at-a-distance-of-k-in-a-binary-tree",
      "step-13-binary-trees__minimum-time-taken-to-burn-the-binary-tree-from-a-node",
    ],
  },

  {
    id: "complete-tree-count",
    title: "Exploiting a complete tree",
    family: "trees",
    aka: ["count nodes in complete binary tree", "left height right height"],
    hook: "If the leftmost and rightmost depths agree, the subtree is perfect — count it with a shift instead of walking it.",
    cues: [
      "the tree is stated to be complete or perfect, and counting must beat O(n)",
      "a structural guarantee that lets whole subtrees be skipped",
      "O(log² n) is the target",
    ],
    template: {
      java: `// Walking the leftmost and rightmost spines: equal depths mean every level is
// full, so the subtree holds 2^h - 1 nodes and needs no traversal at all.
int countNodes(Node n) {
    if (n == null) return 0;
    int lh = 0, rh = 0;
    for (Node c = n; c != null; c = c.left) lh++;
    for (Node c = n; c != null; c = c.right) rh++;
    if (lh == rh) return (1 << lh) - 1;                  // perfect subtree
    return 1 + countNodes(n.left) + countNodes(n.right);
}`,
    },
    recall: [
      "equal left and right spine depths means a perfect subtree, countable as 2^h − 1",
      "only one of the two children can be imperfect at each level, which is why this is O(log² n) and not O(n)",
      "the two spine walks cost O(log n) and happen O(log n) times",
      "(1 << h) − 1 overflows an int past 31 levels — use a long if the bound allows it",
    ],
    complexity: {
      time: "O(log² n)",
      space: "O(log n)",
      note: "Each level does O(log n) spine work, and the recursion only ever descends one imperfect path.",
    },
    traps: [
      "measuring height with a full traversal, which defeats the point",
      "applying it to a tree that is not actually complete",
      "off-by-one in 2^h − 1 from counting depth rather than node count on the spine",
    ],
    problems: ["step-13-binary-trees__count-total-nodes-in-a-complete-binary-tree"],
  },

  {
    id: "tree-construction",
    title: "Rebuilding a tree from traversals",
    family: "trees",
    aka: ["construct from preorder and inorder", "construct from postorder and inorder", "serialize", "deserialize"],
    hook: "Preorder or postorder names the root; inorder says how much of what is left belongs to each side.",
    cues: [
      "two traversal arrays and “build the tree”",
      "“serialise and deserialise” — pick a format and invert it",
      "the theory question of which traversal pairs determine a tree uniquely",
    ],
    template: {
      java: `// Preorder gives the root; inorder splits the rest into left and right. A
// value -> index map on inorder makes the split O(1) instead of a scan.
Node build(int[] pre, int[] in) {
    Map<Integer, Integer> at = new HashMap<>();
    for (int i = 0; i < in.length; i++) at.put(in[i], i);
    return go(pre, 0, pre.length - 1, 0, in.length - 1, at);
}

Node go(int[] pre, int preL, int preR, int inL, int inR, Map<Integer, Integer> at) {
    if (preL > preR) return null;
    Node root = new Node();
    root.val = pre[preL];
    int mid = at.get(root.val);
    int leftSize = mid - inL;                 // how many go left
    root.left  = go(pre, preL + 1, preL + leftSize, inL, mid - 1, at);
    root.right = go(pre, preL + leftSize + 1, preR, mid + 1, inR, at);
    return root;
}

// POSTORDER + inorder: the root is the LAST postorder element, and the right
// subtree comes before it. Same split, indices shifted.

// WHICH PAIRS WORK: inorder + preorder, and inorder + postorder, both
// determine a tree uniquely. Preorder + postorder do NOT, because they cannot
// tell a single left child from a single right child. For a BST, preorder
// alone is enough — inorder is implied, since it is sorted.

// SERIALISE: preorder with explicit null markers is the simplest correct
// format. Level order with markers works too. Deserialise by consuming the
// same sequence in the same order.`,
    },
    recall: [
      "preorder's first element is the root; postorder's last is",
      "leftSize = mid − inL is the number that drives every other index — derive it rather than guessing the bounds",
      "an inorder value→index map turns O(n²) into O(n); it needs distinct values",
      "inorder plus either of the other two is unique; preorder plus postorder is not",
      "a BST needs only its preorder, because its inorder is the sorted order",
      "serialising needs null markers, or the structure cannot be recovered",
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    traps: [
      "scanning inorder for the root at every call, making it O(n²)",
      "getting the preorder right-subtree start wrong — it is preL + leftSize + 1",
      "assuming distinct values when building the index map",
      "serialising without null markers",
      "forgetting that preorder + postorder is ambiguous and attempting it anyway",
    ],
    problems: [
      "step-13-binary-trees__requirements-needed-to-construct-a-unique-binary-tree-theory",
      "step-13-binary-trees__construct-binary-tree-from-inorder-and-preorder",
      "step-13-binary-trees__construct-the-binary-tree-from-postorder-and-inorder-traversal",
      "step-13-binary-trees__serialize-and-deserialize-binary-tree",
    ],
  },

  {
    id: "morris-threading",
    title: "Morris threading — O(1) space traversal",
    family: "trees",
    aka: ["Morris traversal", "threaded binary tree", "flatten tree to linked list", "inorder predecessor"],
    hook: "Borrow the unused right pointer of the inorder predecessor as a temporary way back up.",
    cues: [
      "“traverse in O(1) space” — no stack, no recursion",
      "flatten the tree into a right-skewed linked list in place",
      "half the pointers in a tree are null, and that spare capacity can hold the return path",
    ],
    template: {
      java: `// Morris inorder. At each node with a left child, find its inorder
// predecessor (rightmost node of the left subtree) and thread it back here.
// The second visit finds the thread already in place, which is how you know
// the left subtree is finished — and is when you unthread and visit.
void morrisInorder(Node root, List<Integer> out) {
    Node cur = root;
    while (cur != null) {
        if (cur.left == null) {
            out.add(cur.val);
            cur = cur.right;
        } else {
            Node pred = cur.left;
            while (pred.right != null && pred.right != cur) pred = pred.right;

            if (pred.right == null) {
                pred.right = cur;            // thread, then go left
                cur = cur.left;
            } else {
                pred.right = null;           // UNTHREAD — restores the tree
                out.add(cur.val);            // inorder: visit on the way back
                cur = cur.right;
            }
        }
    }
}
// MORRIS PREORDER: identical, except the visit happens when the thread is
// CREATED rather than removed.
//
// FLATTEN TO A LINKED LIST uses the same threading idea destructively: for
// each node with a left child, find that subtree's rightmost node, attach the
// current right subtree to it, move left up to right, and clear left.`,
    },
    recall: [
      "the predecessor search condition is `pred.right != null && pred.right != cur` — the second half is what stops it looping forever on an existing thread",
      "thread created = first visit (preorder); thread found and removed = left subtree done (inorder)",
      "always unthread, or the tree is left corrupted",
      "O(1) extra space but roughly 2× the pointer traversals; it is not faster, just leaner",
      "flattening is the destructive cousin: the same rightmost-node search, but the structure is kept",
      "the only difference between Morris inorder and preorder is where the visit sits",
    ],
    complexity: {
      time: "O(n) — each edge is walked at most three times",
      space: "O(1)",
    },
    traps: [
      "omitting the `pred.right != cur` guard and spinning on your own thread",
      "forgetting to unthread, leaving a tree with cycles",
      "visiting at the wrong point and getting preorder where you wanted inorder",
      "running it on a tree that must not be mutated, even temporarily — it is not thread-safe or reentrant",
    ],
    problems: [
      "step-13-binary-trees__morris-inorder-traversal-of-a-binary-tree",
      "step-13-binary-trees__morris-preorder-traversal-of-a-binary-tree",
      "step-13-binary-trees__flatten-binary-tree-to-linkedlist",
    ],
  },
];
