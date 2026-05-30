"use client";

import { useEffect, useState } from "react";

import type { Meme } from "@/lib/db/schema";

export function LeaderboardTable() {
  const [leaderboard, setLeaderboard] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const response = await fetch("/api/leaderboard");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load leaderboard.");
        }

        setLeaderboard(data.leaderboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadLeaderboard();
  }, []);

  if (loading) {
    return <p className="text-zinc-600">Loading leaderboard...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Meme</th>
            <th className="px-4 py-3 font-medium">ELO</th>
            <th className="px-4 py-3 font-medium">W-L</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((meme, index) => (
            <tr key={meme.id} className="border-b border-zinc-100 last:border-b-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{index + 1}</td>
              <td className="px-4 py-3 text-zinc-900">{meme.title}</td>
              <td className="px-4 py-3 text-zinc-700">{meme.elo}</td>
              <td className="px-4 py-3 text-zinc-700">
                {meme.wins}-{meme.losses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
