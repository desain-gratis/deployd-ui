export type LocalListSort = "alphabetical" | "recent" | "oldest";

export function groupLocalItems<T>(
  items: T[],
  sort: LocalListSort,
  // eslint-disable-next-line no-unused-vars
  getName: (item: T) => string,
  // eslint-disable-next-line no-unused-vars
  getPublishedAt: (item: T) => string | undefined,
) {
  const sorted = [...items];
  const groups = new Map<string, T[]>();

  if (sort === "alphabetical") {
    sorted.sort((a, b) => getName(a).localeCompare(getName(b), undefined, { sensitivity: "base" }));
    sorted.forEach((item) => {
      const first = getName(item).trim().charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(first) ? first : "#";
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return [...groups.entries()].map(([label, values]) => ({ label, items: values }));
  }

  sorted.sort((a, b) => {
    const aTime = Date.parse(getPublishedAt(a) || "");
    const bTime = Date.parse(getPublishedAt(b) || "");
    return sort === "recent"
      ? (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
      : (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  });

  const now = Date.now();
  sorted.forEach((item) => {
    const time = Date.parse(getPublishedAt(item) || "");
    let key = "Unknown date";
    if (Number.isFinite(time)) {
      const age = now - time;
      if (age < 24 * 60 * 60 * 1000) key = "Today";
      else if (age < 2 * 24 * 60 * 60 * 1000) key = "Yesterday";
      else if (age < 7 * 24 * 60 * 60 * 1000) key = "This week";
      else if (age < 30 * 24 * 60 * 60 * 1000) key = "This month";
      else key = "Older";
    }
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  const order = sort === "recent"
    ? ["Today", "Yesterday", "This week", "This month", "Older", "Unknown date"]
    : ["Unknown date", "Older", "This month", "This week", "Yesterday", "Today"];
  return order.filter((key) => groups.has(key)).map((label) => ({ label, items: groups.get(label)! }));
}
