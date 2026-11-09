// @ts-check
// Linked lists — step 7, the sheet's second-largest step at 47 problems, and
// the one with the most fundamentals: 27 of the 47 are insert/delete drills on
// singly and doubly lists.
//
// Striver's "FAQs (Medium)" mixes the fast-slow pointer family (middle, cycle
// detection, palindrome) with digit arithmetic on lists. "FAQs (Hard)" mixes
// k-group reversal with merge-sorting and a deep clone. They separate here.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "ll-surgery",
    title: "Pointer surgery on a singly list",
    family: "linked-list",
    aka: ["insert in linked list", "delete in linked list", "dummy head", "traversal"],
    hook: "To change a node you must hold the one before it — so keep a previous pointer, or a dummy head.",
    cues: [
      "insert or delete at the head, the tail, the k-th position, or before a value",
      "the head itself may be removed, which is the case that breaks naive code",
      "any list problem at all — this is the toolkit everything else is built from",
    ],
    template: {
      java: `class Node { int val; Node next; Node(int v) { val = v; } }

// A DUMMY HEAD removes every head special case: the real head becomes an
// ordinary node with something before it. Use it by default.
Node deleteValue(Node head, int x) {
    Node dummy = new Node(0);
    dummy.next = head;
    for (Node prev = dummy; prev.next != null; prev = prev.next) {
        if (prev.next.val == x) {
            prev.next = prev.next.next;    // unlink
            break;                         // drop this to remove all of them
        }
    }
    return dummy.next;                     // NOT head — it may have been removed
}

// Insert at the k-th position (1-indexed): walk to k-1, then splice.
Node insertAtK(Node head, int val, int k) {
    Node dummy = new Node(0);
    dummy.next = head;
    Node prev = dummy;
    for (int i = 1; i < k && prev.next != null; i++) prev = prev.next;
    Node fresh = new Node(val);
    fresh.next = prev.next;                // point at the rest FIRST
    prev.next = fresh;                     // then relink
    return dummy.next;
}

// Delete the tail: stop at the second-to-last node, which means testing
// cur.next.next, and handling a single-node list before the loop.
Node deleteTail(Node head) {
    if (head == null || head.next == null) return null;
    Node cur = head;
    while (cur.next.next != null) cur = cur.next;
    cur.next = null;
    return head;
}`,
    },
    recall: [
      "a dummy head turns “delete the first node” into the same code as every other node — reach for it before writing any special case",
      "return dummy.next, never the original head, once a dummy is in play",
      "order matters when splicing: point the new node at the rest of the list before changing the previous node's next",
      "the tail needs cur.next.next, and a one-node list must be handled before the loop",
      "k-th position questions are almost always 1-indexed in the statement and 0-indexed in your loop; write down which",
      "drawing three boxes and the arrows beats reasoning about it in your head, every time",
    ],
    complexity: { time: "O(n) to reach a position, O(1) to splice", space: "O(1)" },
    traps: [
      "returning head after the head was deleted",
      "relinking before saving the next pointer, losing the rest of the list",
      "dereferencing cur.next.next without checking cur.next",
      "an empty or single-node list",
      "breaking after the first match when the problem wanted all occurrences, or the reverse",
    ],
    problems: [
      "introduction-to-singly-linkedlist",
      "traversal-in-linked-list",
      "insertion-in-linked-list",
      "deletion-in-linked-list",
      "insertion-at-the-head-of-ll",
      "insertion-at-the-tail-of-ll",
      "insertion-at-the-kth-position-of-ll",
      "insertion-before-the-value-x-in-ll",
      "step-06-learn-linkedlist__deleting-a-node-in-linkedlist",
      "deletion-of-the-tail-of-ll",
      "deletion-of-the-kth-element-of-ll",
      "delete-the-element-with-value-x",
    ],
  },

  {
    id: "dll-operations",
    title: "Doubly linked lists",
    family: "linked-list",
    aka: ["DLL", "doubly linked list", "prev pointer", "delete node in DLL"],
    hook: "Two pointers per node, so every change touches four links — and you can walk backwards.",
    cues: [
      "insert or delete anywhere in a doubly linked list",
      "a node must be removed given only a reference to it, with no head",
      "two-pointer convergence on a sorted list, which a singly list cannot do",
      "duplicates to remove from a sorted doubly list",
    ],
    template: {
      java: `class DNode { int val; DNode prev, next; DNode(int v) { val = v; } }

// Deleting a node: four links, and both null checks. Write it as unlink, then
// clear, so a half-finished edit is never readable.
DNode delete(DNode head, DNode node) {
    if (node.prev != null) node.prev.next = node.next;
    else head = node.next;                        // it was the head
    if (node.next != null) node.next.prev = node.prev;
    node.prev = node.next = null;                 // leave no dangling links
    return head;
}

// Inserting before a node: four assignments, and only one of them is
// conditional.
void insertBefore(DNode node, int val) {
    DNode fresh = new DNode(val);
    fresh.next = node;
    fresh.prev = node.prev;
    if (node.prev != null) node.prev.next = fresh;
    node.prev = fresh;
}

// REVERSE a DLL: swap prev and next at every node, then return the old tail.
DNode reverse(DNode head) {
    DNode cur = head, last = null;
    while (cur != null) {
        DNode next = cur.next;
        cur.next = cur.prev;
        cur.prev = next;
        last = cur;
        cur = next;                                // the SAVED next
    }
    return last;
}

// PAIRS WITH A GIVEN SUM in a sorted DLL: the backward pointer is what makes
// the array two-pointer technique available — walk one from the head and one
// from the tail and converge. A singly list cannot do this.`,
    },
    recall: [
      "every structural change is four links; name them and tick them off",
      "both prev and next can be null, and both cases need handling — the head and the tail",
      "a dummy head AND a dummy tail removes both, and is worth it for anything non-trivial",
      "reversing swaps prev and next at each node, and the answer is the old tail",
      "after unlinking, null the removed node's own pointers so nothing dangles",
      "the backward pointer is the whole reason a DLL exists: two-pointer convergence on a sorted list becomes possible",
      "removing duplicates from a sorted DLL is one pass, skipping forward while the value repeats",
    ],
    complexity: { time: "O(1) to splice a known node, O(n) to find one", space: "O(1)" },
    traps: [
      "updating only next and leaving prev stale — the list reads fine forwards and is broken backwards",
      "forgetting the head case when node.prev is null",
      "in reverse, reading cur.next after overwriting it instead of the saved copy",
      "returning the original head from reverse rather than the old tail",
    ],
    problems: [
      "introduction-to-doubly-ll",
      "convert-array-to-dll",
      "insertion-in-dll",
      "insert-node-before-head-in-dll",
      "insert-node-before-tail-in-dll",
      "step-06-learn-linkedlist__insert-a-node-in-dll",
      "insert-before-given-node-in-dll",
      "deletion-in-doubly-ll",
      "step-06-learn-linkedlist__delete-a-node-in-dll",
      "delete-kth-element-of-dll",
      "removing-given-node-in-dll",
      "step-06-learn-linkedlist__reverse-a-dll",
      "step-06-learn-linkedlist__delete-all-occurrences-of-a-key-in-dll",
      "step-06-learn-linkedlist__remove-duplicates-from-sorted-dll",
      "step-06-learn-linkedlist__find-pairs-with-given-sum-in-dll",
    ],
  },

  {
    id: "ll-reversal",
    title: "Reversal, whole and in groups",
    family: "linked-list",
    aka: ["reverse linked list", "reverse in k groups", "rotate a list", "three pointers"],
    hook: "Three pointers — previous, current, next — and the only rule is to save next before you overwrite it.",
    cues: [
      "reverse the whole list, or reverse it in blocks of k",
      "rotate the list by k places",
      "a subproblem of something larger: palindrome checks and digit addition both reverse first",
    ],
    template: {
      java: `// The canonical three-pointer loop. Memorise the order of the four lines.
Node reverse(Node head) {
    Node prev = null, cur = head;
    while (cur != null) {
        Node next = cur.next;    // 1. save
        cur.next = prev;         // 2. flip
        prev = cur;              // 3. advance prev
        cur = next;              // 4. advance cur
    }
    return prev;                 // the old tail is the new head
}

// Recursive: reverse the rest, then attach the head to the end of it.
Node reverseRec(Node head) {
    if (head == null || head.next == null) return head;
    Node newHead = reverseRec(head.next);
    head.next.next = head;       // the node after head now points back
    head.next = null;            // and head becomes the tail
    return newHead;
}

// REVERSE IN GROUPS OF K: walk k ahead to check a full group exists, reverse
// that block, then stitch. A dummy head makes the stitching uniform.
Node reverseKGroup(Node head, int k) {
    Node dummy = new Node(0);
    dummy.next = head;
    Node groupPrev = dummy;

    while (true) {
        // Is there a full group left? Partial tails are left untouched.
        Node kth = groupPrev;
        for (int i = 0; i < k && kth != null; i++) kth = kth.next;
        if (kth == null) break;

        Node groupNext = kth.next;
        // Reverse the block, pre-seeding prev with what follows it so the
        // block's new tail already points at the rest of the list.
        Node prev = groupNext, cur = groupPrev.next;
        while (cur != groupNext) {
            Node next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        Node newGroupPrev = groupPrev.next;   // the block's old head, now its tail
        groupPrev.next = kth;                 // kth is the block's new head
        groupPrev = newGroupPrev;
    }
    return dummy.next;
}

// ROTATE by k: find the length, reduce k modulo it, walk to the new tail,
// break there and join the old tail to the old head.`,
    },
    recall: [
      "save, flip, advance, advance — and the answer is prev, not cur",
      "the recursive version's two lines are head.next.next = head then head.next = null, in that order",
      "k-group reversal checks for a full group BEFORE reversing; a partial tail is normally left alone",
      "pre-seeding prev with groupNext is what makes each reversed block already connected to the rest",
      "after reversing a block, its old head is its new tail — keep that pointer before overwriting",
      "rotation reduces k modulo the length first, or a large k walks the list many times over",
    ],
    complexity: {
      time: "O(n)",
      space: "O(1) iterative, O(n) recursive",
    },
    traps: [
      "overwriting cur.next before saving it, which truncates the list",
      "returning cur or head instead of prev",
      "reversing a partial final group when the problem says to leave it",
      "forgetting k modulo length on rotation",
      "losing the block's old head during the k-group stitch",
    ],
    problems: [
      "step-06-learn-linkedlist__reverse-a-linkedlist-iterative",
      "step-06-learn-linkedlist__reverse-a-ll-recursive",
      "step-06-learn-linkedlist__reverse-ll-in-group-of-given-size-k",
      "step-06-learn-linkedlist__rotate-a-ll",
    ],
  },

  {
    id: "ll-two-pointer",
    title: "Fast & slow pointers",
    family: "linked-list",
    aka: ["tortoise and hare", "Floyd cycle detection", "middle of list", "nth from the end", "intersection point"],
    hook: "Two pointers at different speeds, or with a fixed gap — one pass, no length, no extra memory.",
    cues: [
      "the middle of the list without counting its length",
      "“is there a cycle”, where it starts, how long it is",
      "the n-th node from the END, in one pass",
      "where two lists merge into a Y",
      "the obvious solution stores every node in a set, and O(1) space is wanted",
    ],
    template: {
      java: `// MIDDLE: slow moves one, fast moves two. When fast runs out, slow is there.
Node middle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;        // on even length this is the SECOND middle
}

// CYCLE DETECTION (Floyd): if they ever meet, there is a loop.
boolean hasCycle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}

// START OF THE CYCLE: after they meet, reset one pointer to the head and move
// both one step at a time. They meet at the entry. The reason: the distance
// from the head to the entry equals the distance from the meeting point to the
// entry, going forwards round the loop.
Node cycleStart(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            slow = head;
            while (slow != fast) { slow = slow.next; fast = fast.next; }
            return slow;
        }
    }
    return null;
}
// LOOP LENGTH: from the meeting point, walk one pointer round until it returns.

// NTH FROM THE END: a fixed GAP rather than a speed difference. Move fast n
// ahead, then move both until fast falls off.
Node removeNthFromEnd(Node head, int n) {
    Node dummy = new Node(0);
    dummy.next = head;
    Node fast = dummy, slow = dummy;
    for (int i = 0; i < n; i++) fast = fast.next;
    while (fast.next != null) { fast = fast.next; slow = slow.next; }
    slow.next = slow.next.next;
    return dummy.next;
}

// INTERSECTION OF TWO LISTS: walk both, and on falling off the end switch to
// the other list's head. Both pointers then cover the same total distance and
// meet at the join (or at null).

// PALINDROME: find the middle, reverse the second half, compare, and restore.`,
    },
    recall: [
      "`fast != null && fast.next != null` is the loop guard — both halves, in that order",
      "on an even-length list, slow lands on the second middle; shift the start or the guard if you need the first",
      "after they meet, reset one pointer to the head and step both singly to find the cycle entry",
      "n-th from the end is a GAP of n, not a speed difference — and a dummy head handles removing the first node",
      "the intersection trick is to switch heads on reaching null, equalising the distance travelled",
      "palindrome is middle + reverse half + compare; restore the list afterwards if the caller still owns it",
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    traps: [
      "checking fast.next before fast, and dereferencing null",
      "first versus second middle on an even-length list",
      "walking fast n steps from head rather than from the dummy, going off by one",
      "forgetting to restore the reversed half after a palindrome check",
      "assuming the two lists in an intersection problem are the same length",
    ],
    problems: [
      "step-06-learn-linkedlist__middle-of-a-linkedlist-tortoisehare-method",
      "step-06-learn-linkedlist__delete-the-middle-node-of-ll",
      "step-06-learn-linkedlist__detect-a-loop-in-ll",
      "step-06-learn-linkedlist__find-the-starting-point-in-ll",
      "step-06-learn-linkedlist__length-of-loop-in-ll",
      "step-06-learn-linkedlist__remove-nth-node-from-the-back-of-the-ll",
      "step-06-learn-linkedlist__find-the-intersection-point-of-y-ll",
      "step-06-learn-linkedlist__check-if-ll-is-palindrome-or-not",
    ],
  },

  {
    id: "ll-rearrange",
    title: "Rearranging & arithmetic on lists",
    family: "linked-list",
    aka: ["add two numbers", "add one to number", "segregate odd even", "sort 0s 1s 2s", "relink not rewrite"],
    hook: "Build the answer by relinking existing nodes onto separate chains, not by rewriting values.",
    cues: [
      "digits held one per node, to be added or incremented",
      "“segregate the odd and even positions” or “sort 0s, 1s and 2s”",
      "the problem says to change links rather than values",
      "several output chains to be built and then joined",
    ],
    template: {
      java: `// Several chains, each with its own dummy head and tail, then joined. This
// is the shape for every partition-the-list problem.
Node sort012(Node head) {
    Node[] dummy = { new Node(0), new Node(0), new Node(0) };
    Node[] tail = { dummy[0], dummy[1], dummy[2] };

    for (Node cur = head; cur != null; cur = cur.next) {
        tail[cur.val].next = cur;          // append to its chain
        tail[cur.val] = cur;
    }
    // Join, skipping empty chains, and terminate the result.
    tail[2].next = null;
    tail[1].next = dummy[2].next;
    tail[0].next = dummy[1].next != null ? dummy[1].next : dummy[2].next;
    return dummy[0].next;
}
// Terminating tail[2] is essential: without it the last node still points
// back into the middle of the original list and the result is cyclic.

// ADD TWO NUMBERS, digits in reverse order: walk both with a carry, and let
// the loop run while either list remains OR the carry is non-zero.
Node addTwo(Node a, Node b) {
    Node dummy = new Node(0), tail = dummy;
    int carry = 0;
    while (a != null || b != null || carry != 0) {
        int sum = carry + (a != null ? a.val : 0) + (b != null ? b.val : 0);
        carry = sum / 10;
        tail.next = new Node(sum % 10);
        tail = tail.next;
        if (a != null) a = a.next;
        if (b != null) b = b.next;
    }
    return dummy.next;
}

// ADD ONE, digits in forward order: reverse, add with carry, reverse back.
// A carry out of the most significant digit needs a new leading node — 999
// becoming 1000 is the test case to check.

// SEGREGATE ODD AND EVEN POSITIONS: two chains again, taking alternate nodes,
// then join the odd chain to the even one.`,
    },
    recall: [
      "one dummy head and one tail pointer per output chain — that is the whole technique",
      "terminate the final chain with null, or the result loops back into the original list",
      "the carry loop condition is `a != null || b != null || carry != 0`; dropping the carry clause loses the last digit",
      "forward-order digits mean reverse, operate, reverse back",
      "999 + 1 is the case that catches a missing leading node",
      "relinking preserves node identity, which some problems require explicitly",
    ],
    complexity: { time: "O(n)", space: "O(1) when relinking, O(n) when building new nodes" },
    traps: [
      "not nulling the last chain's tail, producing a cycle",
      "joining a chain that is empty, so a dummy node leaks into the result",
      "dropping the final carry",
      "forgetting the new most-significant digit on an all-nines input",
    ],
    problems: [
      "step-06-learn-linkedlist__add-2-numbers-in-ll",
      "step-06-learn-linkedlist__add-1-to-a-number-represented-by-ll",
      "step-06-learn-linkedlist__segrregate-odd-and-even-nodes-in-ll",
      "step-06-learn-linkedlist__sort-a-ll-of-0-s-1-s-and-2-s-by-changing-links",
    ],
  },

  {
    id: "ll-merge-sort",
    title: "Merging & sorting lists",
    family: "linked-list",
    aka: ["merge two sorted lists", "merge sort on a list", "flatten a linked list", "k-way merge"],
    hook: "Merging two sorted lists is the primitive; sorting is merge sort built on it, and flattening is repeated merging.",
    cues: [
      "two or more sorted lists to combine",
      "“sort a linked list” in O(n log n) with no extra array",
      "a list of lists, each sorted, to flatten into one",
      "quicksort's random access is unavailable, so merge sort is the only comfortable O(n log n)",
    ],
    template: {
      java: `// MERGE two sorted lists: a dummy head, then take the smaller head each time.
// Attaching the whole remaining tail at the end avoids a second loop.
Node merge(Node a, Node b) {
    Node dummy = new Node(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = a != null ? a : b;          // whatever is left, in one go
    return dummy.next;
}

// SORT a list: merge sort. Split at the middle, sort both halves, merge. The
// split must DISCONNECT the halves, which is why prev is tracked.
Node sort(Node head) {
    if (head == null || head.next == null) return head;
    Node slow = head, fast = head, prev = null;
    while (fast != null && fast.next != null) {
        prev = slow;
        slow = slow.next;
        fast = fast.next.next;
    }
    prev.next = null;                        // cut — without this, infinite recursion
    return merge(sort(head), sort(slow));
}

// FLATTEN a list of sorted lists: merge them pairwise. Merging them one at a
// time into an accumulator is O(k·n); a heap of the k heads, or pairwise
// divide-and-conquer, is O(n log k).`,
    },
    recall: [
      "merge needs a dummy head, and the leftover tail is attached in one assignment rather than a second loop",
      "use <= in the comparison to keep the merge stable",
      "merge sort on a list is O(1) extra space apart from the recursion stack — no array, unlike on an array",
      "the split MUST sever the first half with prev.next = null, or the recursion never terminates",
      "quicksort is poor here: no random access, so partitioning is awkward and the pivot choice is blind",
      "k lists: a heap of the k current heads, or pairwise merging, both O(n log k)",
    ],
    complexity: {
      time: "O(n) to merge two, O(n log n) to sort, O(n log k) for k lists",
      space: "O(log n) recursion stack",
    },
    traps: [
      "forgetting prev.next = null and recursing forever",
      "a second loop to drain the remaining list instead of one attachment",
      "using < instead of <= and losing stability",
      "merging k lists one at a time into an accumulator, which is O(k·n)",
    ],
    problems: [
      "step-11-heaps__merge-m-sorted-lists",
      "step-06-learn-linkedlist__sort-ll",
      "step-06-learn-linkedlist__flattening-of-ll",
    ],
    borrows: [
      "step-02-learn-important-sorting-techniques__merge-sort",
    ],
  },

  {
    id: "ll-deep-clone",
    title: "Deep-cloning a list with extra pointers",
    family: "linked-list",
    aka: ["clone list with random pointer", "deep copy", "interleaving trick"],
    hook: "Weave the copies into the original list so each node can find its own clone in O(1), with no map.",
    cues: [
      "a deep copy where nodes point at arbitrary other nodes",
      "a random, sibling or child pointer alongside next",
      "the obvious answer is a HashMap from original to copy, and O(1) extra space is wanted",
    ],
    template: {
      java: `// The map version first, because it is the one to write if unsure:
//   pass 1: for each node, map.put(node, new Node(node.val))
//   pass 2: copy.next = map.get(node.next), copy.random = map.get(node.random)
// O(n) time, O(n) space, and hard to get wrong.

// The O(1)-space interleaving trick, in three passes.
Node clone(Node head) {
    if (head == null) return null;

    // 1. Weave: A -> A' -> B -> B' -> ...
    for (Node cur = head; cur != null; cur = cur.next.next) {
        Node copy = new Node(cur.val);
        copy.next = cur.next;
        cur.next = copy;
    }

    // 2. Set the random pointers. cur.random.next IS the clone of
    //    cur.random — that is the whole point of the weave.
    for (Node cur = head; cur != null; cur = cur.next.next) {
        cur.next.random = cur.random == null ? null : cur.random.next;
    }

    // 3. Unweave, restoring the original and extracting the copy.
    Node dummy = new Node(0), tail = dummy;
    for (Node cur = head; cur != null; ) {
        Node copy = cur.next;
        cur.next = copy.next;        // restore the original
        tail.next = copy;
        tail = copy;
        cur = cur.next;
    }
    return dummy.next;
}`,
    },
    recall: [
      "three passes: weave, wire the random pointers, unweave",
      "after weaving, the clone of X is always X.next — that identity replaces the hash map",
      "cur.random.next is the clone of cur.random, with a null guard",
      "restore the original list in the third pass; leaving it woven is a corrupted input",
      "the HashMap version is O(n) space and far easier — write that first and optimise only if asked",
    ],
    complexity: {
      time: "O(n) — three linear passes",
      space: "O(1) beyond the output, versus O(n) for the map version",
    },
    traps: [
      "no null guard on cur.random, dereferencing null in pass 2",
      "failing to restore the original list in pass 3",
      "advancing by cur.next instead of cur.next.next during the woven passes",
      "setting the random pointers before the weave is complete",
    ],
    problems: ["step-06-learn-linkedlist__clone-a-linked-list-with-random-and-next-pointer"],
  },
];
