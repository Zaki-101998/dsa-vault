// @ts-check
// Graph connectivity & structure — the patterns behind Striver's Minimum
// Spanning Tree, Hard Problems II and Additional Algorithms subsections.
//
// This is the family that motivated Patterns view: every problem Striver files
// under "Hard Problems II" is a Disjoint Set Union problem, and the sheet never
// says so, so they get revised as five unrelated hard problems instead of one
// technique with five dressings.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "dsu-core",
    title: "Disjoint Set Union",
    family: "graph-connectivity",
    aka: ["DSU", "union find", "union-find", "union by rank", "union by size", "path compression"],
    hook: "Keep merging groups while answering “are these two already together?”",
    cues: [
      "edges, pairs or merges arrive one at a time and you are asked what is connected",
      "“how many groups / components / islands” after a sequence of merges",
      "a grid where cells switch on one at a time and regions join up",
      "you want to join things by a shared label (an email, a row, a column) rather than by an explicit edge",
      "undirected only, and nothing ever has to be un-merged — DSU cannot undo a union",
    ],
    template: {
      java: `class DSU {
    private final int[] parent, size;
    private int groups;

    DSU(int n) {
        parent = new int[n];
        size = new int[n];
        groups = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }

    // Path compression: every node on the way up is re-pointed at the root.
    int find(int x) {
        return parent[x] == x ? x : (parent[x] = find(parent[x]));
    }

    // Union by size. Returns false when they were already together, which is
    // what makes "count the merges that actually happened" a one-liner.
    boolean union(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) { int t = a; a = b; b = t; }
        parent[b] = a;
        size[a] += size[b];
        groups--;
        return true;
    }

    int componentCount() { return groups; }
    int sizeOf(int x) { return size[find(x)]; }
}`,
      cpp: `struct DSU {
    vector<int> parent, sz;
    int groups;

    DSU(int n) : parent(n), sz(n, 1), groups(n) {
        iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }

    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        parent[b] = a;
        sz[a] += sz[b];
        groups--;
        return true;
    }
};`,
      python: `class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n
        self.groups = n

    def find(self, x: int) -> int:
        # Iterative, so a 10**5-node chain cannot blow the recursion limit.
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> bool:
        a, b = self.find(a), self.find(b)
        if a == b:
            return False
        if self.size[a] < self.size[b]:
            a, b = b, a
        self.parent[b] = a
        self.size[a] += self.size[b]
        self.groups -= 1
        return True`,
    },
    recall: [
      "two arrays: parent[] starting at self, size[] (or rank[]) starting at 1",
      "the two optimisations are independent — path compression in find, union by size in union — and you need both for the amortised bound",
      "union returns a boolean; that return value is the component counter, the cycle test and the Kruskal filter all at once",
      "components = n − (unions that returned true), so count merges rather than re-scanning",
      "a 2-D grid is flattened with r * cols + c before any union",
      "size[find(x)], never size[x] — the size is only meaningful at a root",
    ],
    complexity: {
      time: "O(α(n)) amortised per find/union",
      space: "O(n)",
      note: "α is the inverse Ackermann function; it is ≤ 4 for any n you will ever be given, so treat each operation as effectively O(1).",
    },
    traps: [
      "comparing parent[a] == parent[b] instead of find(a) == find(b) — parents are not roots",
      "unioning without checking the roots first, so the component count drifts",
      "reading size[x] or parent[x] as if x were a root",
      "reaching for DSU when the problem removes edges — unions cannot be undone, so process offline in reverse instead",
      "recursive find in Python on a long chain: the default recursion limit is 1000",
    ],
    problems: [
      "step-15-graphs__disjoint-set-union-by-rank",
      "step-15-graphs__disjoint-set-union-by-size",
      "step-15-graphs__number-of-operations-to-make-network-connected",
      "step-15-graphs__accounts-merge",
      "step-15-graphs__most-stones-removed-with-same-rows-or-columns",
      "step-15-graphs__number-of-island-ii",
      "step-15-graphs__making-a-large-island",
    ],
    borrows: ["step-15-graphs__number-of-provinces-leetcode"],
  },

  {
    id: "mst",
    title: "Minimum spanning tree",
    family: "graph-connectivity",
    aka: ["MST", "Kruskal", "Prim", "spanning tree"],
    hook: "Connect every vertex for the least total weight — take cheap edges, refuse the ones that close a cycle.",
    cues: [
      "“connect all of them as cheaply as possible”, with no destination and no path to print",
      "cost to lay cable / build roads / join every house to the network",
      "undirected and weighted, and the answer is one number: a total weight",
      "exactly n − 1 edges are wanted out of a larger set",
    ],
    template: {
      java: `// Kruskal: sort every edge by weight, keep one only when it joins two
// different components. Reuses the DSU above unchanged.
int kruskal(int n, int[][] edges) {        // edges[i] = { u, v, w }
    Arrays.sort(edges, (x, y) -> Integer.compare(x[2], y[2]));
    DSU dsu = new DSU(n);
    int weight = 0, used = 0;
    for (int[] e : edges) {
        if (dsu.union(e[0], e[1])) {       // false => this edge closes a cycle
            weight += e[2];
            if (++used == n - 1) break;    // spanning tree complete
        }
    }
    return used == n - 1 ? weight : -1;    // -1 => the graph is disconnected
}`,
      cpp: `// Prim: grow one tree, always taking the cheapest edge leaving it.
// Prefer this over Kruskal when the graph is dense (many more edges than nodes).
int prim(int n, vector<vector<pair<int, int>>> &adj) {   // adj[u] = {v, w}
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    vector<bool> inTree(n, false);
    pq.push({0, 0});                       // {weight, node}
    int weight = 0, taken = 0;
    while (!pq.empty() && taken < n) {
        auto [w, u] = pq.top();
        pq.pop();
        if (inTree[u]) continue;           // stale entry, already covered
        inTree[u] = true;
        weight += w;
        taken++;
        for (auto [v, wv] : adj[u])
            if (!inTree[v]) pq.push({wv, v});
    }
    return taken == n ? weight : -1;
}`,
    },
    recall: [
      "Kruskal = sort edges + DSU; Prim = min-heap over the frontier. Same answer, different shape",
      "Kruskal is the one to reach for when the input is already an edge list — which it usually is",
      "an MST always has exactly n − 1 edges; fewer means the graph was disconnected",
      "the cycle test is just DSU's union returning false",
      "mark a node visited when it is popped from the heap, not when pushed, or stale entries double-count",
      "an MST is not unique, but its total weight is — so an answer that is one number is safe to compare",
    ],
    complexity: {
      time: "Kruskal O(E log E) · Prim O(E log V)",
      space: "O(V + E)",
      note: "Kruskal's cost is the sort; the DSU work is effectively linear on top of it.",
    },
    traps: [
      "forgetting to check that n − 1 edges were actually taken, and returning a weight for a disconnected graph",
      "in Prim, skipping the inTree check on pop — the heap holds outdated entries by design",
      "pushing {node, weight} into the heap instead of {weight, node}, so it orders by node id",
      "reaching for MST when the question asks for a shortest path; a path between two nodes in an MST is not the shortest path",
    ],
    problems: [
      "step-15-graphs__minimum-spanning-tree",
      "find-the-mst-weight",
    ],
    borrows: [
      "step-15-graphs__disjoint-set-union-by-size",
      "step-15-graphs__djisktra-s-algorithm",
    ],
  },

  {
    id: "low-link",
    title: "DFS timestamps & low-link",
    family: "graph-connectivity",
    aka: ["Tarjan", "Kosaraju", "bridges", "articulation point", "cut vertex", "SCC"],
    hook: "Timestamp each node on the way down, then report the earliest node the subtree can still reach.",
    cues: [
      "“which single edge / single node, if removed, breaks the graph apart?”",
      "critical connections, cut vertices, bridges in a network",
      "strongly connected components in a directed graph",
      "the answer is about the shape of the graph, not a path or a distance",
    ],
    template: {
      java: `// Bridges. tin[u] is when u was discovered; low[u] is the earliest
// discovery time reachable from u's subtree WITHOUT re-using the edge to its
// parent. Edge (u,v) is a bridge exactly when the subtree at v has no way back.
int timer = 0;
int[] tin, low;
boolean[] seen;
List<List<Integer>> adj;
List<int[]> bridges = new ArrayList<>();

void dfs(int u, int parent) {
    seen[u] = true;
    tin[u] = low[u] = timer++;
    for (int v : adj.get(u)) {
        if (v == parent) continue;                  // the edge we arrived on
        if (seen[v]) {
            low[u] = Math.min(low[u], tin[v]);      // back edge: tin, NOT low
        } else {
            dfs(v, u);
            low[u] = Math.min(low[u], low[v]);      // tree edge: low
            if (low[v] > tin[u]) bridges.add(new int[] { u, v });
        }
    }
}

// Articulation points: same walk, different test.
//   non-root u is a cut vertex when some child v has low[v] >= tin[u]
//   the root is a cut vertex when it has more than one DFS child`,
    },
    recall: [
      "two timestamps per node: tin (discovery) and low (earliest reachable)",
      "back edge updates low with the neighbour's tin; tree edge updates it with the neighbour's low — mixing these up is the classic bug",
      "bridge test is strictly greater: low[v] > tin[u]; articulation test is low[v] >= tin[u]",
      "the root is special for articulation points: it needs two or more DFS children",
      "Kosaraju is the easy SCC: DFS for a finish-time order, reverse every edge, DFS again in that order",
      "skipping the parent edge is by node id here, which breaks on multi-edges — skip by edge index when duplicates are possible",
    ],
    complexity: {
      time: "O(V + E)",
      space: "O(V + E)",
      note: "One DFS for bridges and articulation points; Kosaraju makes two passes, still linear.",
    },
    traps: [
      "using low[v] instead of tin[v] on a back edge, which silently loses bridges",
      "> versus >= : a bridge needs strictly greater, a cut vertex does not",
      "forgetting the root's special case for articulation points",
      "skipping the parent by id when the graph has parallel edges — a second u–v edge means u–v is not a bridge",
      "deep recursion on 10**5 nodes: raise the stack, or write it iteratively",
    ],
    problems: [
      "step-15-graphs__bridges-in-graph",
      "step-15-graphs__articulation-point",
      "step-15-graphs__kosaraju-s-algorithm",
    ],
  },
];