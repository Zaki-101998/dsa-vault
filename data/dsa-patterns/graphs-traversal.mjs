// @ts-check
// Graph foundations, traversal and shortest paths — Striver's step 15 minus the
// connectivity tail, which lives in ./graphs-dsu.mjs.
//
// The regrouping worth noticing: Striver files topological sort under "Cycles"
// and scatters Dijkstra variants across "Shortest Path Algorithms" alongside
// Bellman-Ford and Floyd-Warshall, which are different techniques answering
// different questions. Here they separate.
//
// Escaping rules and the single-home rule are in ./index.mjs.

/** @type {import("../../lib/types").PatternDef[]} */
export const PATTERNS = [
  {
    id: "graph-basics",
    title: "Representation, BFS & DFS",
    family: "graph-foundations",
    aka: ["adjacency list", "adjacency matrix", "breadth first search", "depth first search", "visited array"],
    hook: "Everything else is these two walks with something extra carried along.",
    cues: [
      "the first thing to settle on any graph problem: directed or not, weighted or not, and how it is given to you",
      "BFS when you want layers or the fewest steps; DFS when you want to go deep and come back",
      "almost every graph problem below is one of these two with an extra array",
    ],
    template: {
      java: `// Adjacency list from an edge list. Build this first, every time —
// adjacency-matrix input is converted to it unless the matrix IS the grid.
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
for (int[] e : edges) {
    adj.get(e[0]).add(e[1]);
    adj.get(e[1]).add(e[0]);          // drop this line when directed
}

// BFS — visits in layers, so the first time you reach a node is the fewest
// edges away. Mark visited when you PUSH, never when you pop.
void bfs(int start, List<List<Integer>> adj, boolean[] seen) {
    Queue<Integer> q = new ArrayDeque<>();
    q.add(start);
    seen[start] = true;
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : adj.get(u)) {
            if (seen[v]) continue;
            seen[v] = true;           // here, not at poll time
            q.add(v);
        }
    }
}

void dfs(int u, List<List<Integer>> adj, boolean[] seen) {
    seen[u] = true;
    for (int v : adj.get(u)) if (!seen[v]) dfs(v, adj, seen);
}

// Counting components: start a fresh walk from every unvisited node.
int components(int n, List<List<Integer>> adj) {
    boolean[] seen = new boolean[n];
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (seen[i]) continue;
        count++;
        bfs(i, adj, seen);
    }
    return count;
}`,
      python: `from collections import deque

def bfs(start: int, adj: list[list[int]], seen: list[bool]) -> None:
    q = deque([start])
    seen[start] = True
    while q:
        u = q.popleft()
        for v in adj[u]:
            if not seen[v]:
                seen[v] = True       # on push, not on pop
                q.append(v)

def dfs(u: int, adj: list[list[int]], seen: list[bool]) -> None:
    seen[u] = True
    for v in adj[u]:
        if not seen[v]:
            dfs(v, adj, seen)`,
    },
    recall: [
      "adjacency list for sparse graphs, matrix only when the input already is one; a grid is its own implicit graph with no list to build",
      "BFS marks visited on push — marking on pop lets a node enter the queue several times",
      "the outer loop over all nodes is what handles a disconnected graph; forgetting it is the most common wrong answer",
      "a grid's neighbours are the four deltas {{-1,0},{1,0},{0,-1},{0,1}}, eight if diagonals count — write them as an array, not four copy-pasted blocks",
      "nodes are 0-indexed in the array but often 1-indexed in the problem statement; pick one and convert at the boundary",
    ],
    complexity: {
      time: "O(V + E)",
      space: "O(V + E) for the list, O(V) for the queue and visited array",
      note: "On an r × c grid that is O(r · c), since each cell has at most four edges.",
    },
    traps: [
      "building an undirected edge in one direction only",
      "marking visited on pop in BFS, which inflates the queue and can revisit nodes",
      "recursive DFS on a 10**5-node graph — raise the stack or go iterative",
      "treating an adjacency matrix as a grid: in a matrix, matrix[i][j] means an edge, not a cell",
    ],
    problems: [
      "step-15-graphs__graph-and-types",
      "step-15-graphs__graph-representation-java",
      "traversal-techniques",
      "step-15-graphs__bfs",
      "step-15-graphs__dfs",
      "step-15-graphs__connected-components-logic-explanation",
    ],
  },

  {
    id: "grid-components",
    title: "Flood fill & counting components",
    family: "graph-traversal",
    aka: ["number of islands", "connected components", "flood fill", "provinces"],
    hook: "Walk out from every unvisited cell; each fresh walk is one more island.",
    cues: [
      "“how many islands / provinces / groups / regions”",
      "a grid of land and water, or a matrix saying who is connected to whom",
      "recolour everything reachable from a starting cell",
      "the shape of a region matters (its normalised outline), not just how many there are",
    ],
    template: {
      java: `// One walk per unvisited land cell. The count of walks is the answer.
static final int[][] DIRS = { { -1, 0 }, { 1, 0 }, { 0, -1 }, { 0, 1 } };

int countIslands(char[][] grid) {
    int rows = grid.length, cols = grid[0].length, count = 0;
    boolean[][] seen = new boolean[rows][cols];
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] != '1' || seen[r][c]) continue;
            count++;
            fill(grid, seen, r, c);
        }
    }
    return count;
}

void fill(char[][] grid, boolean[][] seen, int r, int c) {
    seen[r][c] = true;
    for (int[] d : DIRS) {
        int nr = r + d[0], nc = c + d[1];
        if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) continue;
        if (grid[nr][nc] != '1' || seen[nr][nc]) continue;
        fill(grid, seen, nr, nc);
    }
}

// Distinct shapes: record each cell relative to the walk's first cell, so two
// identical islands in different places produce the same key.
//   shape.add((r - baseR) + "," + (c - baseC));   then collect shape in a Set`,
    },
    recall: [
      "count = the number of times the outer loop starts a new walk",
      "bounds check before reading the cell, never after",
      "one shared visited grid across all walks — resetting it per walk recounts the same island",
      "for distinct shapes, store coordinates relative to the walk's starting cell",
      "“provinces” is the same thing on an adjacency matrix: cell [i][j] is an edge, not a place",
      "BFS or DFS both work here; the walk only has to be exhaustive, not ordered",
    ],
    complexity: {
      time: "O(r · c)",
      space: "O(r · c)",
      note: "Each cell is entered once. DFS recursion can reach r · c deep on one long snake of land.",
    },
    traps: [
      "clearing the visited grid inside the outer loop",
      "reading grid[nr][nc] before checking that nr and nc are in range",
      "forgetting that a province's matrix is symmetric, and double-counting edges",
      "recording absolute coordinates for distinct shapes, which makes every island distinct",
    ],
    problems: [
      "step-15-graphs__number-of-provinces-leetcode",
      "step-15-graphs__connected-components-problem-in-matrix",
      "number-of-islands",
      "step-15-graphs__flood-fill",
      "step-15-graphs__number-of-distinct-islands-dfs-multisource",
    ],
  },

  {
    id: "multi-source-bfs",
    title: "Multi-source & boundary BFS",
    family: "graph-traversal",
    aka: ["multisource", "rotten oranges", "boundary dfs", "0-1 matrix", "nearest cell"],
    hook: "Push every starting point into the queue first, then run one BFS — the layers are the answer.",
    cues: [
      "“time for everything to spread / rot / catch fire” — several things start at once",
      "“distance to the nearest X” for every cell, not from one fixed cell",
      "anything touching the boundary is safe, and everything enclosed is not",
      "you were about to run a separate BFS from each source and multiply the work",
    ],
    template: {
      java: `// Seed the queue with EVERY source before the loop starts. One BFS then
// expands all of them together, and the layer a cell is reached in is its
// distance to the nearest source.
int[][] nearest(int[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    int[][] dist = new int[rows][cols];
    Queue<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 1) {
                q.add(new int[] { r, c });   // a source
            } else {
                dist[r][c] = -1;             // not reached yet
            }
        }
    }
    while (!q.isEmpty()) {
        int[] cell = q.poll();
        for (int[] d : DIRS) {
            int nr = cell[0] + d[0], nc = cell[1] + d[1];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (dist[nr][nc] != -1) continue;             // already settled
            dist[nr][nc] = dist[cell[0]][cell[1]] + 1;
            q.add(new int[] { nr, nc });
        }
    }
    return dist;
}

// The boundary variant inverts the question: walk in from every edge cell,
// mark everything reachable as SAFE, and whatever is left over is enclosed.`,
    },
    recall: [
      "seed every source before the first poll — seeding inside the loop is a different algorithm",
      "the distance array doubles as the visited array; -1 means unreached",
      "for “how long until everything spreads”, the answer is the last layer, and anything still unreached means never",
      "boundary problems run it backwards: start from the edges, mark the survivors, and the complement is the answer",
      "multi-source BFS is Dijkstra with every edge weight 1 — reach for the queue, not the heap",
    ],
    complexity: {
      time: "O(r · c)",
      space: "O(r · c)",
      note: "Still one pass, however many sources there are — that is the whole point.",
    },
    traps: [
      "running one BFS per source, turning O(r·c) into O((r·c)²)",
      "counting layers one too many: with sources at layer 0, the answer is the final layer, not the number of polls",
      "forgetting to report “impossible” when a cell is still unreached at the end",
      "on boundary problems, marking the enclosed cells instead of the reachable ones",
    ],
    problems: [
      "step-15-graphs__rotten-oranges",
      "step-15-graphs__0-1-matrix-bfs-problem",
      "step-15-graphs__surrounded-regions-dfs",
      "step-15-graphs__number-of-enclaves-flood-fill-implementation-multisource",
    ],
  },

  {
    id: "cycle-and-colouring",
    title: "Cycle detection & 2-colouring",
    family: "graph-traversal",
    aka: ["detect cycle", "bipartite", "two colouring", "path visited", "back edge"],
    hook: "Walk the graph carrying one extra fact, and look for the contradiction.",
    cues: [
      "“does this graph contain a cycle?” — and directed or undirected changes the answer completely",
      "“can these be split into two groups with no conflict inside either?” — that is bipartite",
      "a dependency graph that must be checked for impossibility before anything else",
      "conflicts, enemies, or alternating levels",
    ],
    template: {
      java: `// UNDIRECTED cycle: seeing an already-visited neighbour that is not the one
// you came from is enough.
boolean hasCycleUndirected(int u, int parent, List<List<Integer>> adj, boolean[] seen) {
    seen[u] = true;
    for (int v : adj.get(u)) {
        if (v == parent) continue;
        if (seen[v]) return true;
        if (hasCycleUndirected(v, u, adj, seen)) return true;
    }
    return false;
}

// DIRECTED cycle: "visited" is not enough — you need "on the current path".
// A node already finished is fine; a node still open above you is a cycle.
boolean hasCycleDirected(int u, List<List<Integer>> adj, boolean[] seen, boolean[] onPath) {
    seen[u] = true;
    onPath[u] = true;
    for (int v : adj.get(u)) {
        if (!seen[v]) {
            if (hasCycleDirected(v, adj, seen, onPath)) return true;
        } else if (onPath[v]) {
            return true;                // back edge into the open path
        }
    }
    onPath[u] = false;                  // done with u, take it off the path
    return false;
}

// BIPARTITE: the same walk, colouring 0/1, failing on a same-coloured
// neighbour. A graph is bipartite exactly when it has no odd cycle.
boolean bipartite(int start, List<List<Integer>> adj, int[] colour) {
    Queue<Integer> q = new ArrayDeque<>();
    q.add(start);
    colour[start] = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : adj.get(u)) {
            if (colour[v] == -1) {
                colour[v] = 1 - colour[u];
                q.add(v);
            } else if (colour[v] == colour[u]) {
                return false;
            }
        }
    }
    return true;
}`,
    },
    recall: [
      "undirected needs visited + parent; directed needs visited + on-path. Using the undirected test on a directed graph is the classic wrong answer",
      "onPath[u] = false on the way out — leaving it set reports cycles that are not there",
      "the BFS version of the undirected test carries the parent in the queue alongside the node",
      "bipartite = no odd-length cycle; the 2-colouring IS the proof",
      "run the whole thing from every unvisited node: the cycle may be in another component",
      "skipping the parent by node id breaks on parallel edges — a doubled u–v edge is a cycle",
    ],
    complexity: {
      time: "O(V + E)",
      space: "O(V)",
      note: "One walk; the extra state is one more boolean or int array per node.",
    },
    traps: [
      "using the parent trick on a directed graph",
      "forgetting to clear onPath when the recursion returns",
      "stopping at the first component and missing a cycle elsewhere",
      "initialising colours to 0 rather than -1, so every node looks already coloured",
    ],
    problems: [
      "step-15-graphs__cycle-detection-in-undirected-graph-dfs",
      "step-15-graphs__cycle-detection-in-unirected-graph-bfs",
      "step-15-graphs__cycle-detection-in-directed-graph-dfs",
      "step-15-graphs__cycle-detection-in-directed-graph-bfs",
      "step-15-graphs__bipartite-graph-dfs",
    ],
  },

  {
    id: "topological-sort",
    title: "Topological sort",
    family: "graph-traversal",
    aka: ["topo sort", "Kahn", "indegree", "course schedule", "dependency order", "DAG"],
    hook: "Repeatedly take whatever has nothing left waiting on it.",
    cues: [
      "“in what order can these be done”, where some must come before others",
      "prerequisites, build order, course schedules, task dependencies",
      "“is this even possible?” — which is the same as asking whether the graph has a cycle",
      "a letter ordering to be deduced from a sorted word list",
      "longest or shortest path in a DAG, where processing in topological order removes the need for Dijkstra",
    ],
    template: {
      java: `// Kahn's algorithm — BFS on indegrees. Prefer this one: it detects the
// cycle for free, and the queue makes the "nothing waiting on it" idea literal.
int[] topoSort(int n, List<List<Integer>> adj) {
    int[] indegree = new int[n];
    for (int u = 0; u < n; u++) for (int v : adj.get(u)) indegree[v]++;

    Queue<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.add(i);

    int[] order = new int[n];
    int at = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        order[at++] = u;
        for (int v : adj.get(u)) {
            if (--indegree[v] == 0) q.add(v);     // last prerequisite cleared
        }
    }
    // Fewer than n placed => something never reached indegree 0 => a cycle.
    return at == n ? order : new int[0];
}

// The DFS version: push a node AFTER all its descendants, then reverse. It
// gives an order but does not detect a cycle on its own.`,
    },
    recall: [
      "Kahn = indegree array + a queue of the zero-indegree nodes; decrement, and enqueue when it hits zero",
      "placed fewer than n nodes means a cycle — this is the cheapest cycle test for a directed graph",
      "the DFS version pushes on the way *out* and reverses at the end",
      "“eventual safe states” is the same walk on the reversed graph: safe = every path ends somewhere",
      "shortest path in a DAG is one relaxation pass in topological order, no heap needed",
      "Alien Dictionary: build edges from the first differing letter of each adjacent pair, and a longer word before its own prefix is invalid",
    ],
    complexity: {
      time: "O(V + E)",
      space: "O(V + E)",
      note: "A topological order is usually not unique; any valid one is accepted unless the problem says otherwise.",
    },
    traps: [
      "counting indegrees by iterating the adjacency list of the wrong endpoint",
      "enqueueing a node every time its indegree drops, instead of only when it reaches zero",
      "forgetting the placed-count check, and returning a truncated order for a cyclic graph",
      "in Alien Dictionary, comparing letters past the end of the shorter word",
      "running it on an undirected graph, where indegree is meaningless",
    ],
    problems: [
      "step-15-graphs__topo-sort",
      "step-15-graphs__kahn-s-algorithm",
      "step-15-graphs__course-schedule-i",
      "step-15-graphs__course-schedule-ii",
      "step-15-graphs__find-eventual-safe-states",
      "step-15-graphs__alien-dictionary",
      "step-15-graphs__shortest-path-in-dag",
    ],
  },

  {
    id: "bfs-unweighted-path",
    title: "Shortest path on an unweighted graph",
    family: "shortest-paths",
    aka: ["unit weights", "word ladder", "BFS shortest path", "fewest steps"],
    hook: "Every edge costs the same, so the first time BFS reaches a node is already the shortest way.",
    cues: [
      "“fewest steps / moves / transformations” with no per-step cost",
      "the states are strings, board positions or numbers rather than numbered nodes",
      "all edges weigh 1 — and you were reaching for Dijkstra",
      "every shortest path is wanted, not just its length",
    ],
    template: {
      java: `// Unit weights: plain BFS. The distance array doubles as the visited check.
int[] shortestPath(int n, int src, List<List<Integer>> adj) {
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    Queue<Integer> q = new ArrayDeque<>();
    dist[src] = 0;
    q.add(src);
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : adj.get(u)) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            q.add(v);
        }
    }
    return dist;
}

// Implicit graphs (Word Ladder): there is no adjacency list. Generate the
// neighbours of a state on the fly and look them up in a HashSet.
//   for each position i, for each letter 'a'..'z': swap it in, and if the
//   resulting word is in the set, that is an edge.
//
// For ALL shortest paths (Word Ladder II), BFS level by level recording every
// parent that reaches a word at its own best depth, then DFS back from the
// target to rebuild the sequences.`,
    },
    recall: [
      "unit weights means a queue, not a heap — Dijkstra here is correct but needlessly slower",
      "dist[] starting at -1 is both the distance and the visited marker",
      "an implicit graph generates neighbours from the state; a HashSet of valid states is the adjacency check",
      "remove a word from the set as you enqueue it, or the same word is expanded repeatedly",
      "for all shortest paths, keep parents per level and rebuild backwards; keeping a single parent only ever gives you one path",
      "process a whole level at a time (poll the queue's current size) when the depth itself is the answer",
    ],
    complexity: {
      time: "O(V + E); Word Ladder is O(N · L · 26) with words of length L",
      space: "O(V)",
      note: "On an implicit graph, V is the number of reachable states, which is what you must bound before starting.",
    },
    traps: [
      "re-expanding a state because it was never removed from the candidate set",
      "settling a node on pop rather than on push, which lets duplicates through",
      "trying to collect all shortest paths with one parent pointer per node",
      "building the full adjacency list for an implicit graph when generating neighbours on demand is cheaper",
    ],
    problems: [
      "step-15-graphs__shortest-path-in-ug-with-unit-weights",
      "step-15-graphs__word-ladder-1",
      "step-15-graphs__word-ladder-2",
    ],
  },

  {
    id: "dijkstra",
    title: "Dijkstra — cheapest path by priority queue",
    family: "shortest-paths",
    aka: ["Dijkstra", "priority queue", "min heap shortest path", "minimum effort"],
    hook: "Always expand the cheapest frontier node, and the first time you settle a node its cost is final.",
    cues: [
      "weighted edges, all weights non-negative, and you want the cheapest route",
      "“minimum effort / cost / time” to get from here to there over a grid or network",
      "the cost of a path is not its length — a max, a product, or a count of something",
      "an extra dimension on the state: cost *and* stops used, or cost *and* number of ways",
    ],
    template: {
      java: `// Settle the cheapest node first. dist[] is the distance array AND the
// "already settled" test, via the stale-entry check after the poll.
int[] dijkstra(int n, int src, List<List<int[]>> adj) {   // adj.get(u) = {v, w}
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;

    // {cost, node}, ordered by cost.
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    pq.add(new int[] { 0, src });

    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int cost = top[0], u = top[1];
        if (cost > dist[u]) continue;         // stale entry — already settled cheaper
        for (int[] edge : adj.get(u)) {
            int v = edge[0], w = edge[1];
            if (cost + w < dist[v]) {
                dist[v] = cost + w;
                pq.add(new int[] { dist[v], v });
                // parent[v] = u;  <- keep this to print the path later
            }
        }
    }
    return dist;
}

// Variants worth recognising:
//   path with minimum effort  -> the cost of a path is the MAX edge on it, so
//                                relax with Math.max(cost, w) instead of cost + w
//   cheapest flights, k stops -> the state is (node, stopsUsed); order the
//                                queue by stops, since cost is not monotone in them
//   number of ways            -> carry a ways[] count beside dist[]: on a
//                                strictly better path overwrite it, on an equal
//                                one add to it`,
    },
    recall: [
      "the heap holds {cost, node} in that order, so it orders by cost",
      "check for a stale entry right after the poll; a node can sit in the heap several times by design",
      "a priority queue, not a plain queue: the greedy argument needs the globally cheapest frontier node, and that is exactly what the theory entry in this pattern explains",
      "non-negative weights only — one negative edge and the settled-is-final guarantee breaks, so go to Bellman-Ford",
      "keep a parent[] to reconstruct the route, then reverse it",
      "when the path cost is not a sum, change only the relaxation step; the skeleton is unchanged",
      "with an extra state dimension, dist becomes 2-D and the queue is ordered by whatever the cost actually is",
    ],
    complexity: {
      time: "O(E log V)",
      space: "O(V + E)",
      note: "On a grid, V = r · c and E ≈ 4V, so O(r · c · log(r · c)).",
    },
    traps: [
      "pushing {node, cost} and silently ordering by node id",
      "marking a node settled when it is pushed rather than when it is polled",
      "using Dijkstra with a negative edge weight",
      "on “k stops”, ordering the queue by cost: the cheapest route may use too many stops, so order by stops instead",
      "forgetting that a cell may be re-entered more cheaply later — do not use a plain boolean visited grid",
      "Integer.MAX_VALUE + w overflowing; guard the relaxation or use a long",
    ],
    problems: [
      "step-15-graphs__djisktra-s-algorithm",
      "step-15-graphs__why-priority-queue-is-used-in-djisktra-s-algorithm",
      "print-shortest-path",
      "step-15-graphs__shortest-path-in-a-binary-maze",
      "step-15-graphs__path-with-minimum-effort",
      "minimum-multiplications-to-reach-end",
      "step-15-graphs__number-of-ways-to-arrive-at-destination",
      "step-15-graphs__cheapest-flights-within-k-stops",
    ],
  },

  {
    id: "bellman-floyd",
    title: "Bellman-Ford & Floyd-Warshall",
    family: "shortest-paths",
    aka: ["Bellman Ford", "Floyd Warshall", "negative cycle", "all pairs shortest path"],
    hook: "Relax every edge, over and over: V−1 rounds from one source, or three nested loops for every pair.",
    cues: [
      "a negative edge weight anywhere — Dijkstra is now wrong, not just slow",
      "“is there a negative cycle?” / arbitrage / a loop that keeps paying out",
      "distances between *every* pair of nodes, not from one source",
      "the graph is small and dense, and n³ is affordable",
    ],
    template: {
      java: `// Bellman-Ford: relax every edge V-1 times. A V-th round that still
// improves something proves a negative cycle.
int[] bellmanFord(int n, int[][] edges, int src) {   // edges[i] = {u, v, w}
    long[] dist = new long[n];
    Arrays.fill(dist, Long.MAX_VALUE / 4);           // /4 leaves room to add
    dist[src] = 0;

    for (int round = 0; round < n - 1; round++) {
        boolean changed = false;
        for (int[] e : edges) {
            if (dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
                changed = true;
            }
        }
        if (!changed) break;                         // settled early
    }
    for (int[] e : edges) {                          // the V-th round
        if (dist[e[0]] + e[2] < dist[e[1]]) return null;   // negative cycle
    }
    return Arrays.stream(dist).mapToInt(d -> (int) d).toArray();
}

// Floyd-Warshall: for each possible intermediate k, can going via k beat
// going direct? The k loop MUST be outermost.
void floydWarshall(int[][] d) {       // d[i][j] = weight, or INF if no edge
    int n = d.length;
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
    // d[i][i] < 0 for any i  =>  negative cycle through i
}`,
    },
    recall: [
      "Bellman-Ford: V−1 rounds over every edge; a V-th improving round means a negative cycle",
      "Floyd-Warshall's k loop is outermost — put it inside and the answer is wrong, not just slow",
      "negative cycle tests: an improving V-th round (Bellman-Ford), or a negative diagonal entry (Floyd-Warshall)",
      "use a large sentinel rather than MAX_VALUE, or the relaxation overflows before it compares",
      "Bellman-Ford wants an edge list, Floyd-Warshall wants a matrix — convert the input to the right shape first",
      "all-pairs on a sparse graph is usually cheaper as Dijkstra from each node than as Floyd-Warshall",
    ],
    complexity: {
      time: "Bellman-Ford O(V · E) · Floyd-Warshall O(V³)",
      space: "O(V) and O(V²)",
      note: "Floyd-Warshall at V = 500 is 1.25 × 10⁸ operations — fine in a compiled language, usually too slow in Python.",
    },
    traps: [
      "nesting Floyd-Warshall's loops as i, j, k",
      "INF + w overflowing an int; skip the relaxation when the source is still INF, or use long",
      "running only V−1 rounds and then claiming there is no negative cycle",
      "reaching for Floyd-Warshall on a large sparse graph when repeated Dijkstra is far cheaper",
    ],
    problems: [
      "step-15-graphs__bellman-ford-algorithm",
      "floyd-warshall-algorithm",
      "step-15-graphs__find-the-city-with-the-smallest-number-of-neighbors-in-a-threshold-distance",
    ],
  },
];
