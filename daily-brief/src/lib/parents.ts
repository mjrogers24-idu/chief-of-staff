export const PARENTS = ["michelle", "dan"] as const;
export type Parent = (typeof PARENTS)[number];

export function isParent(value: unknown): value is Parent {
  return typeof value === "string" && (PARENTS as readonly string[]).includes(value);
}
