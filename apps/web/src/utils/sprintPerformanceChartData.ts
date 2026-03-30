import type { TimesheetEntryRow } from "../types/sprintPerformanceReport";

function parseEffort(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sprintLabel(row: TimesheetEntryRow): string {
  if (row.sprint == null) return "—";
  return String(row.sprint);
}

function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export type SprintAggregatePoint = { sprint: string; hours: number; distinctPages: number };

export function aggregateBySprint(rows: TimesheetEntryRow[]): SprintAggregatePoint[] {
  const bySprint = new Map<string, { hours: number; pages: Set<string> }>();
  for (const r of rows) {
    const sp = sprintLabel(r);
    let g = bySprint.get(sp);
    if (!g) {
      g = { hours: 0, pages: new Set() };
      bySprint.set(sp, g);
    }
    g.hours += parseEffort(r.spend_efforts);
    const pn = r.page_name?.trim();
    if (pn) g.pages.add(pn);
  }
  return [...bySprint.entries()]
    .sort(([a], [b]) => {
      if (a === "—") return 1;
      if (b === "—") return -1;
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    })
    .map(([sprint, v]) => ({
      sprint,
      hours: Math.round(v.hours * 100) / 100,
      distinctPages: v.pages.size,
    }));
}

export type FeatureAggregatePoint = { feature: string; hours: number };

export function aggregateHoursByFeature(rows: TimesheetEntryRow[]): FeatureAggregatePoint[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const f = r.feature_name?.trim() || "—";
    m.set(f, (m.get(f) ?? 0) + parseEffort(r.spend_efforts));
  }
  return [...m.entries()]
    .map(([feature, hours]) => ({ feature, hours: Math.round(hours * 100) / 100 }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 12);
}

export type IndividualTrendDataset = {
  months: string[];
  series: { owner: string; data: (number | null)[] }[];
};

export function individualProductivityTrend(rows: TimesheetEntryRow[], topN = 5): IndividualTrendDataset {
  const ownerTotals = new Map<string, number>();
  for (const r of rows) {
    const o = r.owner_name?.trim() || "—";
    ownerTotals.set(o, (ownerTotals.get(o) ?? 0) + parseEffort(r.spend_efforts));
  }
  const topOwners = [...ownerTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([o]) => o);

  const monthSet = new Set<string>();
  for (const r of rows) {
    const mk = monthKey(r.created_on);
    if (mk) monthSet.add(mk);
  }
  const months = [...monthSet].sort();

  const series = topOwners.map((owner) => {
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      if ((r.owner_name?.trim() || "—") !== owner) continue;
      const mk = monthKey(r.created_on);
      if (!mk) continue;
      byMonth.set(mk, (byMonth.get(mk) ?? 0) + parseEffort(r.spend_efforts));
    }
    const data = months.map((mo) => {
      const v = byMonth.get(mo);
      return v != null && v > 0 ? Math.round(v * 100) / 100 : null;
    });
    return { owner, data };
  });

  return { months, series };
}
