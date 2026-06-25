-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — add `pattern` to items + populate Striver A-Z patterns
-- ════════════════════════════════════════════════════════════════════════
--  Adds a pattern label (sub-grouping within a topic) to sheet_items and
--  quest_items, then tags the 422 Striver A-Z problems with their pattern.
--  Idempotent: ADD COLUMN IF NOT EXISTS + range UPDATEs keyed by order_index.
-- ════════════════════════════════════════════════════════════════════════

alter table public.sheet_items add column if not exists pattern text;
alter table public.quest_items add column if not exists pattern text;

create index if not exists idx_sheet_items_pattern on public.sheet_items (sheet_id, pattern);

update public.sheet_items set pattern = 'Rearrangement & Ordering' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 1 and 5;
update public.sheet_items set pattern = 'Kadane / Max Subarray' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 6 and 8;
update public.sheet_items set pattern = 'Subarray with Sum (Prefix)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 9 and 11;
update public.sheet_items set pattern = 'K-Sum (Two Pointer / Hashing)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 12 and 14;
update public.sheet_items set pattern = 'Missing / Repeating (XOR)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 15 and 17;
update public.sheet_items set pattern = 'Subarray Count (Hashing)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 18 and 20;
update public.sheet_items set pattern = 'Intervals & Sorting Tricks' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 21 and 25;
update public.sheet_items set pattern = 'Matrix Operations' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 26 and 29;
update public.sheet_items set pattern = 'Majority Element (Moore''s Voting)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 30 and 31;
update public.sheet_items set pattern = 'Array Rotation' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 32 and 33;
update public.sheet_items set pattern = 'Count Inversions (Merge Sort)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 34 and 35;
update public.sheet_items set pattern = 'Array Basics' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 36 and 40;
update public.sheet_items set pattern = 'BS on 1D Array (Bounds)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 41 and 46;
update public.sheet_items set pattern = 'BS on Rotated & Variants' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 47 and 53;
update public.sheet_items set pattern = 'BS on Answer Space' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 54 and 64;
update public.sheet_items set pattern = 'BS on 2D Matrix' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 65 and 69;
update public.sheet_items set pattern = 'BS on Two Sorted Arrays' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 70 and 71;
update public.sheet_items set pattern = 'Palindrome & Substrings' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 72 and 76;
update public.sheet_items set pattern = 'Character Counting (Hashing)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 77 and 80;
update public.sheet_items set pattern = 'String Manipulation' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 81 and 87;
update public.sheet_items set pattern = 'LL Basics & Traversal' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 88 and 95;
update public.sheet_items set pattern = 'Reversal & Cycle Detection' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 96 and 101;
update public.sheet_items set pattern = 'Doubly Linked List' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 102 and 108;
update public.sheet_items set pattern = 'LL Medium / Hard' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 109 and 120;
update public.sheet_items set pattern = 'Recursion Basics' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 121 and 125;
update public.sheet_items set pattern = 'Backtracking (Generate / Place)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 126 and 135;
update public.sheet_items set pattern = 'Subsequences & Subsets' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 136 and 142;
update public.sheet_items set pattern = 'Hard Backtracking' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 143 and 146;
update public.sheet_items set pattern = 'Stack / Queue Implementations' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 147 and 152;
update public.sheet_items set pattern = 'Parentheses & Expression Conversion' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 153 and 160;
update public.sheet_items set pattern = 'Next Greater / Smaller (Monotonic)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 161 and 164;
update public.sheet_items set pattern = 'Monotonic Stack Applications' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 165 and 174;
update public.sheet_items set pattern = 'Cache Design (LRU / LFU)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 175 and 176;
update public.sheet_items set pattern = 'Longest Window' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 177 and 180;
update public.sheet_items set pattern = 'Counting Subarrays Window' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 181 and 184;
update public.sheet_items set pattern = 'Hard / Minimum Window' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 185 and 188;
update public.sheet_items set pattern = 'Heap Basics & Implementation' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 189 and 192;
update public.sheet_items set pattern = 'Kth Element & Heap Sort' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 193 and 198;
update public.sheet_items set pattern = 'Heap Problems (Greedy / Design)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 199 and 205;
update public.sheet_items set pattern = 'Easy Greedy' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 206 and 210;
update public.sheet_items set pattern = 'Interval Scheduling' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 211 and 216;
update public.sheet_items set pattern = 'Hard Greedy' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 217 and 221;
update public.sheet_items set pattern = 'Tree Traversals' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 222 and 233;
update public.sheet_items set pattern = 'Tree Properties' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 234 and 241;
update public.sheet_items set pattern = 'Tree Views' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 242 and 246;
update public.sheet_items set pattern = 'Tree Hard (LCA / Morris / Construct)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 247 and 257;
update public.sheet_items set pattern = 'Binary Search Tree' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 258 and 273;
update public.sheet_items set pattern = '1D DP' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 274 and 278;
update public.sheet_items set pattern = 'DP on Grids' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 279 and 285;
update public.sheet_items set pattern = 'DP on Subsequences (Knapsack)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 286 and 293;
update public.sheet_items set pattern = 'Unbounded Knapsack' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 294 and 295;
update public.sheet_items set pattern = 'DP on Strings (LCS)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 296 and 305;
update public.sheet_items set pattern = 'DP on Stocks' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 306 and 311;
update public.sheet_items set pattern = 'Longest Increasing Subsequence' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 312 and 317;
update public.sheet_items set pattern = 'MCM / Partition DP' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 318 and 324;
update public.sheet_items set pattern = 'DP on Squares' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 325 and 328;
update public.sheet_items set pattern = 'Graph Basics' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 329 and 333;
update public.sheet_items set pattern = 'BFS / DFS Problems' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 334 and 347;
update public.sheet_items set pattern = 'Topological Sort' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 348 and 354;
update public.sheet_items set pattern = 'Shortest Path Algorithms' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 355 and 367;
update public.sheet_items set pattern = 'MST & Disjoint Set' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 368 and 378;
update public.sheet_items set pattern = 'Tarjan (Bridges / SCC)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 379 and 381;
update public.sheet_items set pattern = 'Bit Basics' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 382 and 391;
update public.sheet_items set pattern = 'XOR Tricks' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 392 and 394;
update public.sheet_items set pattern = 'Math & Sieve' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 395 and 399;
update public.sheet_items set pattern = 'String Misc' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 400 and 401;
update public.sheet_items set pattern = 'String Hashing & KMP / Z' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 402 and 408;
update public.sheet_items set pattern = 'Trie Implementation' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 409 and 412;
update public.sheet_items set pattern = 'Bit Trie (XOR)' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 413 and 415;
update public.sheet_items set pattern = 'Sorting Algorithms' where sheet_id = '00000000-0000-0000-0000-0000000000a2' and order_index between 416 and 422;

-- Backfill any existing quest items from their source sheet item's pattern.
update public.quest_items qi
set pattern = si.pattern
from public.sheet_items si
where qi.source_item_id = si.id
  and qi.pattern is null
  and si.pattern is not null;
