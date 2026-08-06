/**
 * Pure keyword -> action matching (spec 3.1/3.2). Mirrors
 * ../../src/lib/ruleMatcher.ts in the Next app byte-for-byte — kept as a
 * plain duplicate rather than a shared package since Cloud Functions is a
 * separately deployed Node project with its own dependency tree. If this
 * drifts from the app copy, keep both in sync by hand.
 */

export interface RuleLike {
  keyword: string;
  kid: string | null;
  wearNote: string | null;
  dinnerFlag: string | null;
}

export interface ScheduleItem {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  kid?: string | null;
  source: "recurring" | "calendar" | "uploaded-calendar";
}

export interface MatchedAction {
  item: ScheduleItem;
  rule: RuleLike;
}

/**
 * A rule matches an item when its keyword appears in the item's title.
 * If the rule is scoped to a kid, the item must either be explicitly
 * tagged with that kid (recurring-schedule items) or mention the kid's
 * name in the title (calendar events, which have no kid field of their
 * own).
 */
export function matchBriefRules(items: ScheduleItem[], rules: RuleLike[]): MatchedAction[] {
  const matches: MatchedAction[] = [];

  for (const item of items) {
    const title = item.title.toLowerCase();

    for (const rule of rules) {
      if (!rule.keyword.trim()) continue;
      if (!title.includes(rule.keyword.toLowerCase())) continue;

      if (rule.kid) {
        const ruleKid = rule.kid.toLowerCase();
        const kidMatches = item.kid ? item.kid.toLowerCase() === ruleKid : title.includes(ruleKid);
        if (!kidMatches) continue;
      }

      matches.push({ item, rule });
    }
  }

  return matches;
}
