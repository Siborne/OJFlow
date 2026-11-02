export interface ProblemTagDefinition {
  id: string;
  zh: string;
  en: string;
  aliases?: string[];
}

export const PROBLEM_TAGS: ProblemTagDefinition[] = [
  { id: 'implementation', zh: '实现', en: 'Implementation' },
  { id: 'math', zh: '数学', en: 'Math' },
  { id: 'greedy', zh: '贪心', en: 'Greedy' },
  { id: 'dp', zh: '动态规划', en: 'Dynamic Programming' },
  { id: 'data structures', zh: '数据结构', en: 'Data Structures' },
  { id: 'graphs', zh: '图论', en: 'Graphs' },
  { id: 'binary search', zh: '二分', en: 'Binary Search' },
  { id: 'constructive algorithms', zh: '构造', en: 'Constructive Algorithms' },
  { id: 'brute force', zh: '暴力枚举', en: 'Brute Force' },
  { id: 'sortings', zh: '排序', en: 'Sortings' },
  { id: 'dfs and similar', zh: 'DFS 与搜索', en: 'DFS and Similar' },
  { id: 'trees', zh: '树', en: 'Trees' },
  { id: 'strings', zh: '字符串', en: 'Strings' },
  { id: 'number theory', zh: '数论', en: 'Number Theory' },
  { id: 'combinatorics', zh: '组合数学', en: 'Combinatorics' },
  { id: 'geometry', zh: '计算几何', en: 'Geometry' },
  { id: 'bitmasks', zh: '位运算', en: 'Bitmasks' },
  { id: 'two pointers', zh: '双指针', en: 'Two Pointers' },
  { id: 'dsu', zh: '并查集', en: 'DSU' },
  { id: 'shortest paths', zh: '最短路', en: 'Shortest Paths' },
  { id: 'ternary search', zh: '三分', en: 'Ternary Search' },
  { id: 'matrices', zh: '矩阵', en: 'Matrices' },
  { id: 'hashing', zh: '哈希', en: 'Hashing' },
  { id: 'games', zh: '博弈论', en: 'Games' },
  { id: 'flows', zh: '网络流', en: 'Flows' },
  { id: 'probabilities', zh: '概率', en: 'Probabilities' },
  { id: 'meet-in-the-middle', zh: '折半搜索', en: 'Meet in the Middle' },
  { id: 'divide and conquer', zh: '分治', en: 'Divide and Conquer' },
  { id: 'interactive', zh: '交互题', en: 'Interactive' },
  { id: 'schedules', zh: '调度', en: 'Schedules' },
  { id: 'graph matchings', zh: '图匹配', en: 'Graph Matchings' },
  { id: '2-sat', zh: '2-SAT', en: '2-SAT' },
  { id: 'chinese remainder theorem', zh: '中国剩余定理', en: 'Chinese Remainder Theorem' },
  { id: 'fft', zh: 'FFT', en: 'FFT' },
  { id: 'string suffix structures', zh: '后缀结构', en: 'String Suffix Structures' },
  { id: 'expression parsing', zh: '表达式解析', en: 'Expression Parsing' },
  { id: 'simulation', zh: '模拟', en: 'Simulation' },
  { id: 'prefix sum', zh: '前缀和', en: 'Prefix Sum' },
  { id: 'sliding window', zh: '滑动窗口', en: 'Sliding Window' },
  { id: 'segment tree', zh: '线段树', en: 'Segment Tree' },
  { id: 'fenwick tree', zh: '树状数组', en: 'Fenwick Tree' },
  { id: 'topological sort', zh: '拓扑排序', en: 'Topological Sort' },
  { id: 'arrays', zh: '数组', en: 'Arrays', aliases: ['Array'] },
  { id: 'linked list', zh: '链表', en: 'Linked List', aliases: ['LinkedList'] },
  { id: 'stack', zh: '栈', en: 'Stack' },
  { id: 'queue', zh: '队列', en: 'Queue' },
  { id: 'heap', zh: '堆', en: 'Heap', aliases: ['Priority Queue'] },
  { id: 'hash table', zh: '哈希表', en: 'Hash Table', aliases: ['Hash Map'] },
  { id: 'recursion', zh: '递归', en: 'Recursion' },
  { id: 'backtracking', zh: '回溯', en: 'Backtracking' },
  { id: 'monotonic stack', zh: '单调栈', en: 'Monotonic Stack' },
  { id: 'binary tree', zh: '二叉树', en: 'Binary Tree' },
  { id: 'breadth-first search', zh: '广度优先搜索', en: 'Breadth-First Search', aliases: ['BFS'] },
  { id: 'depth-first search', zh: '深度优先搜索', en: 'Depth-First Search', aliases: ['DFS'] },
  { id: 'memoization', zh: '记忆化搜索', en: 'Memoization' },
  { id: 'trie', zh: '字典树', en: 'Trie' },
  { id: 'union find', zh: '并查集', en: 'Union Find', aliases: ['DSU'] },
  { id: 'difference array', zh: '差分', en: 'Difference Array' },
  { id: 'modular arithmetic', zh: '模运算', en: 'Modular Arithmetic' },
  {
    id: 'greatest common divisor',
    zh: '最大公约数',
    en: 'Greatest Common Divisor',
    aliases: ['GCD'],
  },
  { id: 'prime factorization', zh: '质因数分解', en: 'Prime Factorization' },
  { id: 'fast exponentiation', zh: '快速幂', en: 'Fast Exponentiation' },
  { id: 'inclusion-exclusion', zh: '容斥原理', en: 'Inclusion-Exclusion' },
  { id: 'convex hull', zh: '凸包', en: 'Convex Hull' },
  { id: 'sweep line', zh: '扫描线', en: 'Sweep Line' },
  { id: 'coordinate compression', zh: '离散化', en: 'Coordinate Compression' },
  { id: 'offline queries', zh: '离线查询', en: 'Offline Queries' },
  { id: 'sqrt decomposition', zh: '分块', en: 'Square Root Decomposition' },
  { id: 'persistent data structures', zh: '可持久化数据结构', en: 'Persistent Data Structures' },
  { id: 'counting', zh: '计数', en: 'Counting' },
  { id: 'enumeration', zh: '枚举', en: 'Enumeration' },
  { id: 'bit manipulation', zh: '位操作', en: 'Bit Manipulation' },
  { id: 'brainteaser', zh: '脑筋急转弯', en: 'Brainteaser' },
  { id: 'database', zh: '数据库', en: 'Database' },
  { id: 'shell', zh: 'Shell', en: 'Shell' },
  { id: 'concurrency', zh: '并发', en: 'Concurrency' },
  { id: 'design', zh: '设计题', en: 'Design' },
];

const tagByValue = new Map<string, ProblemTagDefinition>();

for (const tag of PROBLEM_TAGS) {
  tagByValue.set(tag.id.toLowerCase(), tag);
  tagByValue.set(tag.en.toLowerCase(), tag);
  tagByValue.set(tag.zh, tag);
  for (const alias of tag.aliases ?? []) {
    tagByValue.set(alias.toLowerCase(), tag);
  }
}

export function normalizeProblemTag(value: string): string {
  const normalized = value.trim().toLowerCase();
  const definition = tagByValue.get(normalized) ?? tagByValue.get(value.trim());
  return definition?.id ?? value.trim().toLowerCase();
}

export function getProblemTagLabel(value: string, locale: 'zh-CN' | 'en-US'): string {
  const normalized = value.trim().toLowerCase();
  const definition = tagByValue.get(normalized) ?? tagByValue.get(value.trim());
  if (!definition) return value;
  return locale === 'zh-CN' ? definition.zh : definition.en;
}
