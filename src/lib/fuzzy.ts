/** Lightweight subsequence + prefix fuzzy scoring. Higher is better; 0 = no match. */
export function fuzzyScore(candidate: string, query: string): number {
  const c = candidate.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (c === q) return 1000;
  if (c.startsWith(q)) return 800 - (c.length - q.length);
  if (c.includes(q)) return 600 - (c.length - q.length);

  let ci = 0;
  let score = 300;
  let streak = 0;
  for (const ch of q) {
    const found = c.indexOf(ch, ci);
    if (found === -1) {
      // allow one transposition-ish miss
      score -= 60;
      streak = 0;
      if (score <= 0) return 0;
      continue;
    }
    score += streak > 0 && found === ci ? 8 : 0;
    streak = found === ci ? streak + 1 : 0;
    score -= Math.min(found - ci, 10);
    ci = found + 1;
  }
  return Math.max(score, 0);
}

export function fuzzyRank<T>(items: T[], query: string, key: (item: T) => string, limit = 8): T[] {
  if (!query.trim()) return [];
  return items
    .map((item) => ({ item, score: fuzzyScore(key(item), query) }))
    .filter((r) => r.score > 100)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}
