"use client";

import { useEffect, useState } from "react";

import type { InsightAggregates } from "@/lib/insights/aggregates";

function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function formatWinRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function BreakdownBars({
  title,
  items,
  accentClass,
}: {
  title: string;
  items: InsightAggregates["humorStyle"]["topTier"];
  accentClass: string;
}) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">No humor style data yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.value}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-zinc-700">{item.label}</span>
              <span className="font-medium text-zinc-900">
                {item.count} ({formatPercent(item.share)})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full ${accentClass}`}
                style={{ width: `${Math.max(item.share * 100, 4)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightsDashboard() {
  const [data, setData] = useState<InsightAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInsights() {
      try {
        const response = await fetch("/api/insights");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load insights.");
        }

        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load insights.");
      } finally {
        setLoading(false);
      }
    }

    void loadInsights();
  }, []);

  if (loading) {
    return <p className="text-zinc-600">Loading insights...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  if (!data) {
    return null;
  }

  const hasAnalysis = data.totals.withReadyInsights > 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Memes in pool" value={String(data.totals.memes)} />
        <StatCard label="Analyzed" value={String(data.totals.withReadyInsights)} />
        <StatCard label="Pending" value={String(data.totals.pending)} />
        <StatCard label="Failed" value={String(data.totals.failed)} />
      </section>

      {!hasAnalysis ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-600">
          <p>No extracted insights yet. Run:</p>
          <code className="mt-2 block rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800">
            npm run extract:insights
          </code>
        </div>
      ) : (
        <>
          {data.highlights.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-900">What wins</h2>
              <ul className="mt-4 space-y-2 text-zinc-700">
                {data.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900">Humor style</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Top {data.tierSize} vs bottom {data.tierSize} memes by ELO.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <BreakdownBars
                title="Top tier"
                items={data.humorStyle.topTier}
                accentClass="bg-emerald-500"
              />
              <BreakdownBars
                title="Bottom tier"
                items={data.humorStyle.bottomTier}
                accentClass="bg-zinc-400"
              />
            </div>
            {!data.humorStyle.canCompare && (
              <p className="mt-4 text-sm text-zinc-500">
                Need more analyzed memes to compare top and bottom tiers separately.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Format vs ELO</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Average ELO and win rate by meme format across all analyzed memes.
            </p>
            {data.formats.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No format data yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Format</th>
                      <th className="px-3 py-2 font-medium">Count</th>
                      <th className="px-3 py-2 font-medium">Avg ELO</th>
                      <th className="px-3 py-2 font-medium">Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.formats.map((format) => (
                      <tr key={format.format} className="border-b border-zinc-100 last:border-b-0">
                        <td className="px-3 py-3 text-zinc-900">{format.label}</td>
                        <td className="px-3 py-3 text-zinc-700">{format.count}</td>
                        <td className="px-3 py-3 font-medium text-zinc-900">{format.avgElo}</td>
                        <td className="px-3 py-3 text-zinc-700">
                          {formatWinRate(format.avgWinRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Subjects in top memes</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Recurring topics among the highest-ranked analyzed memes.
            </p>
            {data.topSubjects.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No subject data yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100">
                {data.topSubjects.map((subject) => (
                  <li
                    key={subject.subject}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="font-medium text-zinc-900">{subject.subject}</span>
                    <span className="text-zinc-600">
                      {subject.count} meme{subject.count === 1 ? "" : "s"} · avg {subject.avgElo}{" "}
                      ELO
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
